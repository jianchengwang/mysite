package app

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"golang.org/x/net/html"
)

type SyncPublisher interface {
	Token(context.Context) (string, error)
	UploadWithReceipt(context.Context, string, ImageData, bool) (string, ProviderReceipt, error)
	AddDraftWithReceipt(context.Context, string, DraftRequest, string, string) (string, ProviderReceipt, error)
}

type SyncDraftService struct {
	AcceptContext context.Context
	Cache         DraftCache
	Publisher     SyncPublisher
	Images        *http.Client
	Budget        time.Duration
	TTL           time.Duration
	slots         chan struct{}
}

func NewSyncDraftService(cache DraftCache, publisher SyncPublisher, images *http.Client, ttl time.Duration) *SyncDraftService {
	return &SyncDraftService{AcceptContext: context.Background(), Cache: cache, Publisher: publisher, Images: images, Budget: 45 * time.Second, TTL: ttl, slots: make(chan struct{}, 2)}
}

func syncDraftError(w http.ResponseWriter, status int, stage, message string) {
	providerSuccess := boolPointer(false)
	state := "not_accepted"
	if stage == "lookup" {
		providerSuccess = nil
		state = "result_unavailable"
	}
	jsonResponse(w, status, SyncDraftReply{APIVersion: 2, Mode: "synchronous", RequestID: newID(), Status: state, Stage: stage, ProviderSuccess: providerSuccess, HTTPStatus: status, Receipts: []SyncReceipt{}, RedactedMessage: message})
}

func sendCachedDraft(w http.ResponseWriter, record DraftCacheRecord) {
	reply := cachedDraftReply(record)
	status := reply.HTTPStatus
	if reply.Status == "processing" {
		status = 409
		w.Header().Set("Retry-After", "2")
	}
	if status < 200 || status > 599 {
		status = 503
	}
	w.Header().Set("Location", "/api/mp/draft/result")
	jsonResponse(w, status, reply)
}

func (s *Server) syncDraftResult(w http.ResponseWriter, r *http.Request) {
	if s.SyncDraft == nil || !keyPattern.MatchString(r.Header.Get("Idempotency-Key")) {
		syncDraftError(w, 400, "lookup", "Valid Idempotency-Key and synchronous mode are required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	record, err := s.SyncDraft.Cache.Get(ctx, draftCacheKey(s.Config.AppID, r.Header.Get("Idempotency-Key")))
	if errors.Is(err, ErrNotFound) {
		syncDraftError(w, 404, "lookup", "No retained receipt; absence does not authorize resubmission")
		return
	}
	if err != nil {
		syncDraftError(w, 503, "lookup", "Receipt cache unavailable; do not submit a new key")
		return
	}
	// Lookup returns the operation's HTTP status, not an unconditional 200.
	sendCachedDraft(w, record)
}

func (s *Server) createSyncDraft(w http.ResponseWriter, r *http.Request) {
	service := s.SyncDraft
	if service == nil || service.Cache == nil || service.Publisher == nil || s.Config.AppID == "" || s.Config.AppSecret == "" {
		syncDraftError(w, 503, "configuration", "Synchronous draft service unavailable")
		return
	}
	if r.Header.Get("X-MP-Draft-API") != "2" {
		syncDraftError(w, 428, "migration", "Synchronous API requires X-MP-Draft-API: 2; update the client before sending drafts")
		return
	}
	key := r.Header.Get("Idempotency-Key")
	if !keyPattern.MatchString(key) || !strings.HasPrefix(key, "v2.") {
		syncDraftError(w, 400, "validation", "Idempotency-Key must start with v2. and contain 16–128 permitted characters")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8<<20)
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var request DraftRequest
	if decoder.Decode(&request) != nil || decoder.Decode(new(any)) != io.EOF {
		syncDraftError(w, 400, "validation", "Invalid or oversized JSON")
		return
	}
	if err := request.Validate(); err != nil {
		syncDraftError(w, 400, "validation", err.Error())
		return
	}
	s.executeSyncDraft(w, r, request, "create", func(ctx context.Context, key string, record *DraftCacheRecord) {
		service.process(ctx, request, key, record)
	})
}

// Creation and content-only updates share receipt reservation, fencing, shutdown and deadlines.
func (s *Server) executeSyncDraft(w http.ResponseWriter, r *http.Request, payload any, operation string, process func(context.Context, string, *DraftCacheRecord)) {
	service := s.SyncDraft
	key := r.Header.Get("Idempotency-Key")
	data, _ := json.Marshal(payload)
	hash := sha256.Sum256(append([]byte(s.Config.AppID+"\x00"+operation+"\x00"), data...))
	cacheKey := draftCacheKey(s.Config.AppID, key)
	if service.AcceptContext.Err() != nil {
		syncDraftError(w, 503, "admission", "Server is shutting down; no new operation accepted")
		return
	}
	// Allow receipt replay even while both execution slots are occupied.
	lookupCtx, lookupCancel := context.WithTimeout(r.Context(), 2*time.Second)
	existing, lookupErr := service.Cache.Get(lookupCtx, cacheKey)
	lookupCancel()
	if lookupErr == nil {
		if existing.RequestHash != hex.EncodeToString(hash[:]) {
			syncDraftError(w, 409, "idempotency", "Idempotency-Key belongs to another request")
			return
		}
		sendCachedDraft(w, existing)
		return
	}
	if !errors.Is(lookupErr, ErrNotFound) {
		syncDraftError(w, 503, "idempotency", "Receipt cache unavailable; no remote write attempted")
		return
	}
	select {
	case service.slots <- struct{}{}:
		defer func() { <-service.slots }()
	default:
		syncDraftError(w, 429, "admission", "Draft concurrency limit reached; no remote write attempted")
		return
	}
	// Extend this route only. An unsupported response writer fails before reservation/writes.
	if http.NewResponseController(w).SetWriteDeadline(time.Now().Add(service.Budget+10*time.Second)) != nil {
		syncDraftError(w, 503, "admission", "Cannot establish a bounded synchronous response deadline")
		return
	}
	started := time.Now().UTC()
	id := newID()
	record := DraftCacheRecord{Owner: id, RequestHash: hex.EncodeToString(hash[:]), Deadline: started.Add(service.Budget), Reply: SyncDraftReply{APIVersion: 2, Mode: "synchronous", RequestID: id, Status: "processing", Stage: "preparing", ProviderSuccess: boolPointer(false), Receipts: []SyncReceipt{}, HTTPStatus: 409, ExpiresAt: started.Add(service.TTL)}}
	reserveCtx, reserveCancel := context.WithTimeout(r.Context(), 2*time.Second)
	reserved, owned, err := service.Cache.Reserve(reserveCtx, cacheKey, record, service.TTL)
	reserveCancel()
	if errors.Is(err, ErrConflict) {
		syncDraftError(w, 409, "idempotency", "Idempotency-Key belongs to another request")
		return
	}
	if err != nil {
		syncDraftError(w, 503, "idempotency", "Could not confirm reservation; no remote write attempted; query this key")
		return
	}
	if !owned {
		sendCachedDraft(w, reserved)
		return
	}
	// Once reserved, a client disconnect must not cause a second remote write. Finish inline,
	// under the same fixed budget, and retain the compact receipt for subsequent lookup.
	ctx, cancel := context.WithDeadline(context.Background(), record.Deadline)
	defer cancel()
	process(ctx, cacheKey, &record)
	record.Reply.DurationMS = time.Since(started).Milliseconds()
	finishCtx, finishCancel := context.WithTimeout(context.Background(), 3*time.Second)
	err = service.Cache.Update(finishCtx, cacheKey, record)
	finishCancel()
	if err != nil {
		record.Reply.CacheWarning = true
	}
	logSyncDraft(record.Reply)
	w.Header().Set("Location", "/api/mp/draft/result")
	jsonResponse(w, record.Reply.HTTPStatus, record.Reply)
}

func logSyncDraft(reply SyncDraftReply) {
	slog.Info("mp_draft_sync", "request_id", reply.RequestID, "stage", reply.Stage, "status", reply.Status, "duration_ms", reply.DurationMS, "provider_errcode", reply.ProviderErrcode, "provider_http_status", reply.ProviderHTTPStatus, "partial_success", reply.PartialSuccess, "cache_warning", reply.CacheWarning)
}

func (s *SyncDraftService) process(ctx context.Context, request DraftRequest, key string, record *DraftCacheRecord) {
	reply := &record.Reply
	fail := func(err error) {
		message, code, httpStatus, _ := diagnosticError(err)
		reply.Status = "failed"
		reply.HTTPStatus = 502
		reply.RedactedMessage = message
		reply.ProviderErrcode = code
		reply.ProviderHTTPStatus = httpStatus
		var remote *RemoteError
		if errors.As(err, &remote) && remote.Unknown {
			reply.Status = "needs_reconciliation"
		}
		if errors.Is(err, context.DeadlineExceeded) || ctx.Err() != nil {
			reply.HTTPStatus = 504
		}
		if reply.Stage == "draft_add_pending" {
			if reply.Status == "needs_reconciliation" {
				reply.ProviderSuccess = nil
			} else {
				reply.ProviderSuccess = boolPointer(false)
			}
		}
		reply.PartialSuccess = len(reply.Receipts) > 0
	}
	progress := func(stage string) bool {
		reply.Stage = stage
		updateCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		if s.Cache.Update(updateCtx, key, *record) != nil {
			reply.Status = "failed"
			reply.HTTPStatus = 503
			reply.CacheWarning = true
			reply.RedactedMessage = "Receipt checkpoint unavailable; no further remote write attempted"
			if reply.RemoteWritePossible {
				reply.Status = "needs_reconciliation"
			}
			reply.PartialSuccess = len(reply.Receipts) > 0
			return false
		}
		return true
	}
	nodes, images, err := prepareHTML(request.Content)
	if err != nil {
		reply.Status = "failed"
		reply.HTTPStatus = 400
		reply.RedactedMessage = "Article HTML invalid or exceeds image limit"
		return
	}
	cover := request.CoverData
	if cover == "" {
		cover = request.CoverURL
	}
	if cover == "" && len(images) > 0 {
		cover = source(images[0])
	}
	if cover == "" {
		reply.Status = "failed"
		reply.HTTPStatus = 400
		reply.RedactedMessage = "A cover image is required"
		return
	}
	if !progress("prepare_images") {
		return
	}
	loaded := map[string]ImageData{}
	refs := []string{cover}
	for _, node := range images {
		refs = append(refs, source(node))
	}
	for _, ref := range refs {
		if _, ok := loaded[ref]; ok {
			continue
		}
		image, e := LoadImage(ctx, s.Images, ref)
		if e != nil {
			fail(e)
			if ctx.Err() == nil {
				reply.HTTPStatus = 400
			}
			return
		}
		loaded[ref] = image
	}
	if !progress("token") {
		return
	}
	token, err := s.Publisher.Token(ctx)
	if err != nil {
		fail(err)
		return
	}
	// Deduplicate by bytes and purpose within this request. Cross-request MySQL media
	// ledgers remain exclusive to the legacy worker; new requests never use them.
	uploaded := map[string]string{}
	upload := func(stage string, image ImageData, isCover bool) (string, bool) {
		sum := sha256.Sum256(image.Data)
		digest := hex.EncodeToString(sum[:])
		purpose := "content"
		if isCover {
			purpose = "cover"
		}
		if value, ok := uploaded[purpose+digest]; ok {
			return value, true
		}
		wasPossible := reply.RemoteWritePossible
		reply.RemoteWritePossible = true // Persist conservative intent before the non-idempotent write.
		if !progress(stage + "_pending") {
			reply.RemoteWritePossible = wasPossible
			if !wasPossible {
				reply.Status = "failed"
			}
			return "", false
		}
		value, meta, e := s.Publisher.UploadWithReceipt(ctx, token, image, isCover)
		if e != nil {
			fail(e)
			return "", false
		}
		if value == "" || isCover && !validMediaID(value) {
			fail(&RemoteError{Unknown: true, Message: "Missing upload receipt"})
			return "", false
		}
		receipt := SyncReceipt{Stage: stage, ImageSHA256: digest, ProviderErrcode: meta.Errcode, ProviderHTTPStatus: meta.HTTPStatus}
		if isCover {
			receipt.MediaID = value
		} else {
			remote := sha256.Sum256([]byte(value))
			receipt.RemoteSHA256 = hex.EncodeToString(remote[:])
		}
		reply.Receipts = append(reply.Receipts, receipt)
		uploaded[purpose+digest] = value
		if !progress(stage + "_confirmed") {
			return "", false
		}
		return value, true
	}
	for i, node := range images {
		value, ok := upload(fmt.Sprintf("upload_content_image_%d", i+1), loaded[source(node)], false)
		if !ok {
			return
		}
		setSource(node, value)
	}
	coverID, ok := upload("upload_cover", loaded[cover], true)
	if !ok {
		return
	}
	var rendered bytes.Buffer
	for _, node := range nodes {
		if err = html.Render(&rendered, node); err != nil {
			fail(err)
			return
		}
	}
	reply.ProviderSuccess = nil // Pending draft/add has no definitive provider outcome.
	if !progress("draft_add_pending") {
		reply.ProviderSuccess = boolPointer(false) // This handler did not call draft/add.
		return
	}
	reply.RemoteWritePossible = true
	draftID, meta, err := s.Publisher.AddDraftWithReceipt(ctx, token, request, rendered.String(), coverID)
	if err != nil {
		fail(err)
		return
	}
	if !validMediaID(draftID) {
		fail(&RemoteError{Unknown: true, Message: "Missing draft identifier"})
		return
	}
	reply.Status = "succeeded"
	reply.Stage = "draft_add_confirmed"
	reply.ProviderSuccess = boolPointer(true)
	reply.MediaID = draftID
	reply.ArticleCount = 1
	reply.HTTPStatus = 200
	reply.ProviderErrcode = meta.Errcode
	reply.ProviderHTTPStatus = meta.HTTPStatus
	reply.Receipts = append(reply.Receipts, SyncReceipt{Stage: "draft_add", MediaID: draftID, ProviderErrcode: meta.Errcode, ProviderHTTPStatus: meta.HTTPStatus})
}
