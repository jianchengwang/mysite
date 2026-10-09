package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"golang.org/x/net/html"
	"io"
	"net/http"
	"net/url"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"time"
)

// No title, digest, thumb, credentials or replacement media_id can be supplied.
type ContentUpdateRequest struct {
	MediaID               string `json:"media_id"`
	Index                 int    `json:"index"`
	ExpectedContentSHA256 string `json:"expected_content_sha256"`
	Content               string `json:"content"`
}
type DraftEditor interface {
	GetDraft(context.Context, string, string) ([]map[string]json.RawMessage, error)
	UpdateDraftContent(context.Context, string, string, int, map[string]json.RawMessage) (ProviderReceipt, error)
}

var contentHashPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

func (s *Server) updateDraftContent(w http.ResponseWriter, r *http.Request) {
	service := s.SyncDraft
	if service == nil || service.Cache == nil || s.Config.AppID == "" || s.Config.AppSecret == "" {
		syncDraftError(w, 503, "configuration", "Content update requires synchronous mode")
		return
	}
	editor, ok := service.Publisher.(DraftEditor)
	if !ok {
		syncDraftError(w, 503, "configuration", "Content update unavailable")
		return
	}
	if r.Header.Get("X-MP-Draft-API") != "2" {
		syncDraftError(w, 428, "migration", "Content update requires X-MP-Draft-API: 2")
		return
	}
	key := r.Header.Get("Idempotency-Key")
	if !keyPattern.MatchString(key) || (!strings.HasPrefix(key, "v2.update.") && !strings.HasPrefix(key, "v2.layout.")) {
		syncDraftError(w, 400, "validation", "Content update requires a distinct v2.layout. or v2.update. Idempotency-Key")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8<<20)
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var req ContentUpdateRequest
	if decoder.Decode(&req) != nil || decoder.Decode(new(any)) != io.EOF || !validMediaID(req.MediaID) || req.Index != 0 || !contentHashPattern.MatchString(req.ExpectedContentSHA256) || strings.TrimSpace(req.Content) == "" {
		syncDraftError(w, 400, "validation", "Expected existing media_id, index 0, lowercase SHA256 and non-empty content only")
		return
	}
	s.executeSyncDraft(w, r, req, "content-update", func(ctx context.Context, key string, record *DraftCacheRecord) {
		service.processContentUpdate(ctx, editor, req, key, record)
	})
}

// Compare parsed token structure and each decoded text node, allowing only p.style changes.
// Thus images, URLs, paragraph boundaries and prose cannot be replaced by this endpoint.
func formattingSignature(content string) ([]string, error) {
	z := html.NewTokenizer(strings.NewReader(content))
	out := []string{}
	for {
		kind := z.Next()
		if kind == html.ErrorToken {
			if z.Err() == io.EOF {
				return out, nil
			}
			return nil, z.Err()
		}
		token := z.Token()
		if token.Type == html.StartTagToken || token.Type == html.SelfClosingTagToken {
			attrs := []html.Attribute{}
			for _, a := range token.Attr {
				if token.Data == "p" && a.Key == "style" {
					continue
				}
				attrs = append(attrs, a)
			}
			token.Attr = attrs
			sort.Slice(token.Attr, func(i, j int) bool {
				return token.Attr[i].Namespace+":"+token.Attr[i].Key < token.Attr[j].Namespace+":"+token.Attr[j].Key
			})
		}
		data, _ := json.Marshal(token)
		out = append(out, string(data))
	}
}
func articleMetadata(article map[string]json.RawMessage) map[string]json.RawMessage {
	result := map[string]json.RawMessage{}
	for key, value := range article {
		if key != "content" && key != "url" && key != "thumb_url" {
			result[key] = value
		}
	}
	return result
}
func (s *SyncDraftService) processContentUpdate(ctx context.Context, editor DraftEditor, request ContentUpdateRequest, key string, record *DraftCacheRecord) {
	reply := &record.Reply
	reply.Stage = "draft_get"
	fail := func(err error, write bool) {
		message, code, status, _ := diagnosticError(err)
		reply.Status = "failed"
		reply.HTTPStatus = 502
		reply.RedactedMessage = message
		reply.ProviderErrcode = code
		reply.ProviderHTTPStatus = status
		var remote *RemoteError
		if write && errors.As(err, &remote) && remote.Unknown {
			reply.Status = "needs_reconciliation"
			reply.ProviderSuccess = nil
		}
		if ctx.Err() != nil {
			reply.HTTPStatus = 504
			if write {
				reply.Status = "needs_reconciliation"
				reply.ProviderSuccess = nil
			}
		}
	}
	token, err := s.Publisher.Token(ctx)
	if err != nil {
		fail(err, false)
		return
	}
	articles, err := editor.GetDraft(ctx, token, request.MediaID)
	if err != nil {
		fail(err, false)
		return
	}
	// This rollout supports only existing single-article drafts, index 0.
	if len(articles) != 1 {
		reply.Status = "failed"
		reply.HTTPStatus = 409
		reply.RedactedMessage = "Expected exactly one existing article; no write attempted"
		return
	}
	current := articles[0]
	var oldContent string
	if json.Unmarshal(current["content"], &oldContent) != nil {
		reply.Status = "failed"
		reply.HTTPStatus = 502
		reply.RedactedMessage = "Current draft content missing; no write attempted"
		return
	}
	hash := sha256.Sum256([]byte(oldContent))
	if hex.EncodeToString(hash[:]) != request.ExpectedContentSHA256 {
		reply.Status = "precondition_failed"
		reply.HTTPStatus = 409
		reply.RedactedMessage = "Current content differs from expected SHA256; no write attempted"
		return
	}
	oldSignature, e1 := formattingSignature(oldContent)
	newSignature, e2 := formattingSignature(request.Content)
	if e1 != nil || e2 != nil || !reflect.DeepEqual(oldSignature, newSignature) {
		reply.Status = "failed"
		reply.HTTPStatus = 400
		reply.RedactedMessage = "Only paragraph styles may change; prose, structure and image/link attributes must remain identical"
		return
	}
	// Preserve all observed article metadata. Only temporary read-only URLs are omitted.
	update := map[string]json.RawMessage{}
	for k, v := range current {
		if k != "url" && k != "thumb_url" {
			update[k] = v
		}
	}
	update["content"], _ = json.Marshal(request.Content)
	reply.Stage = "draft_update_pending"
	reply.RemoteWritePossible = true
	reply.ProviderSuccess = nil
	saveCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	err = s.Cache.Update(saveCtx, key, *record)
	cancel()
	if err != nil {
		reply.Status = "failed"
		reply.HTTPStatus = 503
		reply.RemoteWritePossible = false
		reply.ProviderSuccess = boolPointer(false)
		reply.CacheWarning = true
		reply.RedactedMessage = "Write-intent checkpoint unavailable; no update attempted"
		return
	}
	receipt, err := editor.UpdateDraftContent(ctx, token, request.MediaID, request.Index, update)
	if err != nil {
		fail(err, true)
		return
	}
	reply.ProviderSuccess = boolPointer(true)
	reply.ProviderErrcode = receipt.Errcode
	reply.ProviderHTTPStatus = receipt.HTTPStatus
	reply.MediaID = request.MediaID
	reply.ArticleCount = 1
	reply.Receipts = []SyncReceipt{{Stage: "draft_update", MediaID: request.MediaID, ProviderErrcode: receipt.Errcode, ProviderHTTPStatus: receipt.HTTPStatus}}
	reply.Stage = "draft_get_verification"
	after, err := editor.GetDraft(ctx, token, request.MediaID)
	if err != nil {
		reply.Status = "needs_reconciliation"
		reply.HTTPStatus = 502
		reply.PartialSuccess = true
		reply.RedactedMessage = "Update acknowledged; readback unavailable. Retain media_id; do not resubmit"
		return
	}
	var afterContent string
	if len(after) != 1 || json.Unmarshal(after[0]["content"], &afterContent) != nil || afterContent != request.Content || !reflect.DeepEqual(articleMetadata(current), articleMetadata(after[0])) {
		reply.Status = "needs_reconciliation"
		reply.HTTPStatus = 409
		reply.PartialSuccess = true
		reply.RedactedMessage = "Update acknowledged; readback content or metadata differs. Retain media_id; inspect current draft"
		return
	}
	reply.Status = "succeeded"
	reply.Stage = "completed"
	reply.HTTPStatus = 200
}

func (w *WeChat) GetDraft(ctx context.Context, token, mediaID string) ([]map[string]json.RawMessage, error) {
	body, _ := json.Marshal(map[string]string{"media_id": mediaID})
	// The existing transport disables redirects and has no automatic POST retry.
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.BaseURL+"/cgi-bin/draft/get?access_token="+url.QueryEscape(token), strings.NewReader(string(body)))
	if err != nil {
		return nil, errors.New("Draft read request invalid")
	}
	req.Header.Set("Content-Type", "application/json")
	response, err := w.Client.Do(req)
	if err != nil {
		return nil, errors.New("Draft read unavailable; no update attempted")
	}
	defer response.Body.Close()
	data, err := io.ReadAll(io.LimitReader(response.Body, 8<<20+1))
	if err != nil || len(data) > 8<<20 {
		return nil, errors.New("Draft read incomplete; no update attempted")
	}
	var result struct {
		NewsItem []map[string]json.RawMessage `json:"news_item"`
		Errcode  *int                         `json:"errcode"`
	}
	if json.Unmarshal(data, &result) != nil || response.StatusCode != 200 {
		return nil, errors.New("Draft read response invalid; no update attempted")
	}
	if result.Errcode != nil && *result.Errcode != 0 {
		return nil, providerFailure(false, result.Errcode, response.StatusCode, false, "Official draft read rejected")
	}
	if len(result.NewsItem) == 0 {
		return nil, errors.New("Draft read has no articles; no update attempted")
	}
	return result.NewsItem, nil
}
func (w *WeChat) UpdateDraftContent(ctx context.Context, token, mediaID string, index int, article map[string]json.RawMessage) (ProviderReceipt, error) {
	body, _ := json.Marshal(map[string]any{"media_id": mediaID, "index": index, "articles": article})
	result, err := w.call(ctx, "/cgi-bin/draft/update", token, "application/json", body)
	if err != nil {
		return ProviderReceipt{}, err
	}
	receipt := successfulProviderReceipt(result)
	if receipt.Errcode == nil || *receipt.Errcode != 0 {
		return ProviderReceipt{}, providerFailure(true, receipt.Errcode, receipt.HTTPStatus, false, "Draft update acknowledgement missing; inspect current draft before any resubmission")
	}
	return receipt, nil
}
