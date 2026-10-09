package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// Synthetic fixtures only. Production has no memory fallback.
type syntheticDraftCache struct {
	mu               sync.Mutex
	records          map[string]DraftCacheRecord
	down             bool
	failStage        string
	failFinal        bool
	loseReserveReply bool
}

func cloneDraftRecord(record DraftCacheRecord) DraftCacheRecord {
	data, _ := json.Marshal(record)
	var copy DraftCacheRecord
	_ = json.Unmarshal(data, &copy)
	return copy
}
func (c *syntheticDraftCache) Ping(context.Context) error {
	if c.down {
		return ErrDraftCacheUnavailable
	}
	return nil
}
func (c *syntheticDraftCache) Get(_ context.Context, key string) (DraftCacheRecord, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.down {
		return DraftCacheRecord{}, ErrDraftCacheUnavailable
	}
	v, ok := c.records[key]
	if !ok {
		return v, ErrNotFound
	}
	return cloneDraftRecord(v), nil
}
func (c *syntheticDraftCache) Reserve(_ context.Context, key string, record DraftCacheRecord, _ time.Duration) (DraftCacheRecord, bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.down {
		return DraftCacheRecord{}, false, ErrDraftCacheUnavailable
	}
	if v, ok := c.records[key]; ok {
		if v.RequestHash != record.RequestHash {
			return v, false, ErrConflict
		}
		return cloneDraftRecord(v), false, nil
	}
	c.records[key] = cloneDraftRecord(record)
	if c.loseReserveReply {
		return DraftCacheRecord{}, false, ErrDraftCacheUnavailable
	}
	return record, true, nil
}
func (c *syntheticDraftCache) Update(_ context.Context, key string, record DraftCacheRecord) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.down || c.failStage == record.Reply.Stage || c.failFinal && record.Reply.Status == "succeeded" {
		return ErrDraftCacheUnavailable
	}
	old, ok := c.records[key]
	if !ok || old.Owner != record.Owner || old.RequestHash != record.RequestHash || old.Reply.Status != "processing" {
		return ErrDraftCacheUnavailable
	}
	c.records[key] = cloneDraftRecord(record)
	return nil
}

type syntheticSyncPublisher struct {
	uploads     atomic.Int32
	adds        atomic.Int32
	addError    error
	uploadError error
	entered     chan struct{}
	release     chan struct{}
	code        *int
}

func (p *syntheticSyncPublisher) Token(context.Context) (string, error) {
	return "SYNTHETIC_TOKEN", nil
}
func (p *syntheticSyncPublisher) UploadWithReceipt(_ context.Context, _ string, _ ImageData, cover bool) (string, ProviderReceipt, error) {
	p.uploads.Add(1)
	if p.uploadError != nil {
		return "", ProviderReceipt{}, p.uploadError
	}
	if cover {
		return "SYNTHETIC_COVER_ID", ProviderReceipt{Errcode: p.code, HTTPStatus: 200}, nil
	}
	return "https://synthetic.example/image?secret=SYNTHETIC_SECRET", ProviderReceipt{Errcode: p.code, HTTPStatus: 200}, nil
}
func (p *syntheticSyncPublisher) AddDraftWithReceipt(ctx context.Context, _ string, _ DraftRequest, _, _ string) (string, ProviderReceipt, error) {
	p.adds.Add(1)
	if p.entered != nil {
		close(p.entered)
		select {
		case <-p.release:
		case <-ctx.Done():
			return "", ProviderReceipt{}, providerFailure(true, nil, 0, false, "synthetic response lost")
		}
	}
	if p.addError != nil {
		return "", ProviderReceipt{}, p.addError
	}
	return "SYNTHETIC_DRAFT_ID", ProviderReceipt{Errcode: p.code, HTTPStatus: 200}, nil
}

type deadlineRecorder struct{ *httptest.ResponseRecorder }

func (w deadlineRecorder) SetWriteDeadline(time.Time) error { return nil }
func synchronousFixture(p *syntheticSyncPublisher) (http.Handler, *syntheticDraftCache, *memoryStore, *SyncDraftService) {
	c := &syntheticDraftCache{records: map[string]DraftCacheRecord{}}
	store := newStore()
	service := NewSyncDraftService(c, p, SafeImageClient(), time.Hour)
	h := (&Server{Config: Config{APIKey: testKey, AppID: "synthetic-app", AppSecret: "SYNTHETIC_SECRET", DraftMode: "sync"}, Store: store, SyncDraft: service}).Handler()
	return h, c, store, service
}
func syncRequest(h http.Handler, key, body string, version bool) *httptest.ResponseRecorder {
	r := httptest.NewRequest("POST", "/api/mp/draft", strings.NewReader(body))
	r.Header.Set("Authorization", "Bearer "+testKey)
	r.Header.Set("Idempotency-Key", key)
	if version {
		r.Header.Set("X-MP-Draft-API", "2")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(deadlineRecorder{w}, r)
	return w
}
func synchronousBody() string {
	request := DraftRequest{Title: "Synthetic title", Content: "<p>SYNTHETIC_BODY_SECRET</p><img src=\"" + pngData() + "\">", CoverData: pngData(), ShowCoverPic: 1}
	data, _ := json.Marshal(request)
	return string(data)
}
func syncReply(t *testing.T, w *httptest.ResponseRecorder) SyncDraftReply {
	t.Helper()
	var reply SyncDraftReply
	if json.Unmarshal(w.Body.Bytes(), &reply) != nil {
		t.Fatal(w.Body.String())
	}
	return reply
}

func TestSyncDraftSuccessReplayAndNoSQLBody(t *testing.T) {
	p := &syntheticSyncPublisher{}
	h, c, store, _ := synchronousFixture(p)
	one := syncRequest(h, "v2.synthetic-success-01", synchronousBody(), true)
	reply := syncReply(t, one)
	if one.Code != 200 || reply.ProviderSuccess == nil || !*reply.ProviderSuccess || reply.MediaID != "SYNTHETIC_DRAFT_ID" || reply.ProviderErrcode != nil {
		t.Fatal(one.Body.String())
	}
	two := syncRequest(h, "v2.synthetic-success-01", synchronousBody(), true)
	if two.Code != 200 || p.adds.Load() != 1 || len(store.tasks) != 0 || len(store.media) != 0 {
		t.Fatal("replay wrote a task, media ledger or second draft")
	}

	// Fixture title wording is deliberately not relied on; modify a decoded request.
	var changed DraftRequest
	_ = json.Unmarshal([]byte(synchronousBody()), &changed)
	changed.Title = "Different synthetic title"
	changedJSON, _ := json.Marshal(changed)
	conflict := syncRequest(h, "v2.synthetic-success-01", string(changedJSON), true)
	if conflict.Code != 409 {
		t.Fatal(conflict.Code)
	}
	for _, record := range c.records {
		raw, _ := json.Marshal(record)
		for _, forbidden := range []string{"SYNTHETIC_SECRET", "SYNTHETIC_TOKEN", "SYNTHETIC_BODY_SECRET", "data:image", "prepared_content", "<p>", "\"content\"", "\"title\""} {
			if bytes.Contains(raw, []byte(forbidden)) {
				t.Fatalf("cache leaked %s", forbidden)
			}
		}
	}
}

func TestSyncDraftExplicitMigrationAndCacheFailClosed(t *testing.T) {
	p := &syntheticSyncPublisher{}
	h, c, _, _ := synchronousFixture(p)
	if w := syncRequest(h, "v2.synthetic-migration", synchronousBody(), false); w.Code != 428 {
		t.Fatal(w.Code)
	}
	if w := syncRequest(h, "legacy-synthetic-key", synchronousBody(), true); w.Code != 400 {
		t.Fatal(w.Code)
	}
	c.down = true
	if w := syncRequest(h, "v2.synthetic-unavailable", synchronousBody(), true); w.Code != 503 {
		t.Fatal(w.Code)
	}
	if p.uploads.Load() != 0 || p.adds.Load() != 0 {
		t.Fatal("cache outage reached provider")
	}
}

func TestSyncDraftConcurrentDuplicatesAndClientDisconnect(t *testing.T) {
	p := &syntheticSyncPublisher{entered: make(chan struct{}), release: make(chan struct{})}
	h, _, _, _ := synchronousFixture(p)
	clientCtx, cancel := context.WithCancel(context.Background())
	defer cancel()
	r := httptest.NewRequest("POST", "/api/mp/draft", strings.NewReader(synchronousBody())).WithContext(clientCtx)
	r.Header.Set("Authorization", "Bearer "+testKey)
	r.Header.Set("Idempotency-Key", "v2.synthetic-concurrent")
	r.Header.Set("X-MP-Draft-API", "2")
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() { w := httptest.NewRecorder(); h.ServeHTTP(deadlineRecorder{w}, r); done <- w }()
	<-p.entered
	cancel()
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if w := syncRequest(h, "v2.synthetic-concurrent", synchronousBody(), true); w.Code != 409 {
				t.Errorf("pending: %d", w.Code)
			}
		}()
	}
	wg.Wait()
	close(p.release)
	if w := <-done; w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if p.adds.Load() != 1 {
		t.Fatal("duplicate or canceled upstream write")
	}
}

func TestSyncDraftFailureSemanticsNeverRetry(t *testing.T) {
	code := 48001
	cases := []struct {
		name    string
		err     error
		status  string
		http    int
		unknown bool
	}{
		{"explicit_errcode", providerFailure(false, &code, 200, false, "synthetic rejection"), "failed", 502, false},
		{"response_lost", providerFailure(true, nil, 0, false, "synthetic response lost"), "needs_reconciliation", 502, true},
		{"http_5xx", providerFailure(true, nil, 503, false, "synthetic upstream unavailable"), "needs_reconciliation", 502, true},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			p := &syntheticSyncPublisher{addError: test.err}
			h, _, _, _ := synchronousFixture(p)
			w := syncRequest(h, "v2.synthetic-failure-01", synchronousBody(), true)
			reply := syncReply(t, w)
			if w.Code != test.http || reply.Status != test.status || !reply.PartialSuccess || reply.Retryable || test.unknown != (reply.ProviderSuccess == nil) {
				t.Fatal(w.Body.String())
			}
			if !test.unknown && (reply.ProviderErrcode == nil || *reply.ProviderErrcode != code || reply.ProviderHTTPStatus != 200) {
				t.Fatal("lost real errcode")
			}
			_ = syncRequest(h, "v2.synthetic-failure-01", synchronousBody(), true)
			if p.adds.Load() != 1 {
				t.Fatal("non-idempotent call retried")
			}
		})
	}
}

func TestSyncDraftTimeoutAndReceiptPersistenceFailure(t *testing.T) {
	t.Run("timeout", func(t *testing.T) {
		p := &syntheticSyncPublisher{entered: make(chan struct{}), release: make(chan struct{})}
		h, _, _, service := synchronousFixture(p)
		service.Budget = 100 * time.Millisecond
		w := syncRequest(h, "v2.synthetic-timeout-01", synchronousBody(), true)
		reply := syncReply(t, w)
		if w.Code != 504 || reply.Status != "needs_reconciliation" || reply.ProviderSuccess != nil {
			t.Fatal(w.Code, w.Body.String())
		}
		_ = syncRequest(h, "v2.synthetic-timeout-01", synchronousBody(), true)
		if p.adds.Load() != 1 {
			t.Fatal("timeout retried")
		}
	})
	t.Run("final_cache_lost", func(t *testing.T) {
		p := &syntheticSyncPublisher{}
		h, c, _, _ := synchronousFixture(p)
		c.failFinal = true
		w := syncRequest(h, "v2.synthetic-final-lost", synchronousBody(), true)
		reply := syncReply(t, w)
		if w.Code != 200 || reply.ProviderSuccess == nil || !*reply.ProviderSuccess || !reply.CacheWarning || reply.MediaID == "" {
			t.Fatal(w.Body.String())
		}
		_ = syncRequest(h, "v2.synthetic-final-lost", synchronousBody(), true)
		if p.adds.Load() != 1 {
			t.Fatal("lost final cache caused duplicate")
		}
	})
	t.Run("checkpoint_before_draft", func(t *testing.T) {
		p := &syntheticSyncPublisher{}
		h, c, _, _ := synchronousFixture(p)
		c.failStage = "draft_add_pending"
		w := syncRequest(h, "v2.synthetic-checkpoint", synchronousBody(), true)
		reply := syncReply(t, w)
		if w.Code != 503 || !reply.PartialSuccess || !reply.CacheWarning || p.adds.Load() != 0 {
			t.Fatal(w.Body.String())
		}
	})
}

func TestSyncDraftExpiredPendingLookupAndLegacyRead(t *testing.T) {
	p := &syntheticSyncPublisher{}
	h, c, store, _ := synchronousFixture(p)
	key := "v2.synthetic-interrupted"
	c.records[draftCacheKey("synthetic-app", key)] = DraftCacheRecord{Owner: "synthetic", RequestHash: "hash", Deadline: time.Now().Add(-time.Minute), Reply: SyncDraftReply{APIVersion: 2, Status: "processing", Stage: "draft_add_pending", ProviderSuccess: boolPointer(false), HTTPStatus: 409}}
	r := httptest.NewRequest("GET", "/api/mp/draft/result", nil)
	r.Header.Set("Authorization", "Bearer "+testKey)
	r.Header.Set("Idempotency-Key", key)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	reply := syncReply(t, w)
	if w.Code != 409 || reply.Status != "needs_reconciliation" || reply.ProviderSuccess != nil || p.adds.Load() != 0 {
		t.Fatal(w.Body.String())
	}
	legacy, _, err := store.Reserve(context.Background(), "legacy-fixture-key", "hash", json.RawMessage(`{"synthetic":true}`))
	if err != nil {
		t.Fatal(err)
	}
	r = httptest.NewRequest("GET", "/api/tasks/"+legacy.ID, nil)
	r.Header.Set("Authorization", "Bearer "+testKey)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
}

func TestSuccessfulProviderReceiptAndSafeSyncLogs(t *testing.T) {
	for _, input := range []string{`{"media_id":"SYNTHETIC_ID"}`, `{"media_id":"SYNTHETIC_ID","errcode":0}`} {
		var result map[string]any
		_ = json.Unmarshal([]byte(input), &result)
		meta := successfulProviderReceipt(result)
		if strings.Contains(input, "errcode") != (meta.Errcode != nil) || meta.HTTPStatus != 200 {
			t.Fatal("fabricated or dropped errcode")
		}
	}
	var buf bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&buf, nil)))
	defer slog.SetDefault(previous)
	code := 48001
	logSyncDraft(SyncDraftReply{RequestID: "synthetic-request", Stage: "draft_add_pending", Status: "failed", DurationMS: 123, ProviderErrcode: &code, ProviderHTTPStatus: 200, RedactedMessage: "SYNTHETIC_SECRET"})
	if strings.Contains(buf.String(), "SYNTHETIC_SECRET") || !strings.Contains(buf.String(), `"duration_ms":123`) || !strings.Contains(buf.String(), `"provider_errcode":48001`) {
		t.Fatal(buf.String())
	}
}

func TestSyncDraftLostReservationAndShutdownRejectBeforeWrites(t *testing.T) {
	t.Run("lost_reservation_reply", func(t *testing.T) {
		p := &syntheticSyncPublisher{}
		h, c, _, _ := synchronousFixture(p)
		c.loseReserveReply = true
		if w := syncRequest(h, "v2.synthetic-reserve-lost", synchronousBody(), true); w.Code != 503 {
			t.Fatal(w.Code)
		}
		if w := syncRequest(h, "v2.synthetic-reserve-lost", synchronousBody(), true); w.Code != 409 {
			t.Fatal(w.Code)
		}
		if p.uploads.Load() != 0 || p.adds.Load() != 0 {
			t.Fatal("ambiguous reservation reached provider")
		}
	})
	t.Run("shutdown", func(t *testing.T) {
		p := &syntheticSyncPublisher{}
		h, c, _, service := synchronousFixture(p)
		ctx, cancel := context.WithCancel(context.Background())
		service.AcceptContext = ctx
		cancel()
		if w := syncRequest(h, "v2.synthetic-shutdown-01", synchronousBody(), true); w.Code != 503 {
			t.Fatal(w.Code)
		}
		if len(c.records) != 0 || p.uploads.Load() != 0 || p.adds.Load() != 0 {
			t.Fatal("shutdown accepted an operation")
		}
	})
}

func TestSyncDraftBadImageAndUploadUnknownNeverAddDraft(t *testing.T) {
	t.Run("all_images_before_write", func(t *testing.T) {
		p := &syntheticSyncPublisher{}
		h, _, _, _ := synchronousFixture(p)
		request := DraftRequest{Title: "Synthetic", Content: `<p>synthetic</p><img src="https://127.0.0.1/private">`, CoverData: pngData()}
		data, _ := json.Marshal(request)
		w := syncRequest(h, "v2.synthetic-bad-image", string(data), true)
		if w.Code != 400 || p.uploads.Load() != 0 || p.adds.Load() != 0 {
			t.Fatal(w.Code, w.Body.String())
		}
	})
	t.Run("upload_unknown", func(t *testing.T) {
		p := &syntheticSyncPublisher{uploadError: providerFailure(true, nil, 0, false, "synthetic upload response lost")}
		h, _, _, _ := synchronousFixture(p)
		w := syncRequest(h, "v2.synthetic-upload-lost", synchronousBody(), true)
		reply := syncReply(t, w)
		if reply.Status != "needs_reconciliation" || reply.ProviderSuccess == nil || *reply.ProviderSuccess || p.adds.Load() != 0 {
			t.Fatal(w.Body.String())
		}
		_ = syncRequest(h, "v2.synthetic-upload-lost", synchronousBody(), true)
		if p.uploads.Load() != 1 {
			t.Fatal("upload implicitly retried")
		}
	})
}

func TestWeChatSyncReceiptAndCoverFlagWireContract(t *testing.T) {
	for _, response := range []string{`{"media_id":"SYNTHETIC_DRAFT_ID"}`, `{"media_id":"SYNTHETIC_DRAFT_ID","errcode":0}`, `{"errcode":48001,"errmsg":"SYNTHETIC_SECRET"}`} {
		t.Run(response, func(t *testing.T) {
			var calls atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				var input struct {
					Articles []struct {
						ShowCoverPic int    `json:"show_cover_pic"`
						Thumb        string `json:"thumb_media_id"`
					} `json:"articles"`
				}
				if r.URL.Path != "/cgi-bin/draft/add" || json.NewDecoder(r.Body).Decode(&input) != nil || len(input.Articles) != 1 || input.Articles[0].ShowCoverPic != 1 || input.Articles[0].Thumb != "SYNTHETIC_THUMB" {
					t.Error("cover flag or thumb not forwarded")
				}
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(response))
			}))
			defer server.Close()
			publisher := NewWeChat("synthetic-app", "SYNTHETIC_SECRET")
			publisher.BaseURL = server.URL
			publisher.Client = server.Client()
			id, meta, err := publisher.AddDraftWithReceipt(context.Background(), "SYNTHETIC_TOKEN", DraftRequest{Title: "Synthetic", ShowCoverPic: 1}, "<p>synthetic</p>", "SYNTHETIC_THUMB")
			if strings.Contains(response, "48001") {
				var provider *ProviderError
				if !errors.As(err, &provider) || provider.ProviderErrcode == nil || *provider.ProviderErrcode != 48001 {
					t.Fatal("HTTP 200 rejection lost actual errcode")
				}
			}
			if !strings.Contains(response, "48001") && (err != nil || id == "" || strings.Contains(response, "errcode") != (meta.Errcode != nil)) {
				t.Fatal("success receipt invalid", meta, err)
			}
			if calls.Load() != 1 {
				t.Fatal("write retried")
			}
		})
	}
}

func TestSyncDraftRealHTTPResponseLossLookup(t *testing.T) {
	p := &syntheticSyncPublisher{entered: make(chan struct{}), release: make(chan struct{})}
	handler, cache, _, _ := synchronousFixture(p)
	server := httptest.NewUnstartedServer(handler)
	server.Config = HTTPServer("", handler)
	server.Start()
	defer server.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request, _ := http.NewRequestWithContext(ctx, "POST", server.URL+"/api/mp/draft", strings.NewReader(synchronousBody()))
	request.Header.Set("Authorization", "Bearer "+testKey)
	request.Header.Set("Idempotency-Key", "v2.synthetic-http-loss")
	request.Header.Set("X-MP-Draft-API", "2")
	clientResult := make(chan error, 1)
	go func() {
		response, err := server.Client().Do(request)
		if response != nil {
			response.Body.Close()
		}
		clientResult <- err
	}()
	select {
	case <-p.entered:
	case <-time.After(3 * time.Second):
		t.Fatal("provider not reached")
	}
	cancel()
	if err := <-clientResult; err == nil {
		t.Fatal("client did not lose response")
	}
	close(p.release)
	deadline := time.Now().Add(3 * time.Second)
	for {
		record, err := cache.Get(context.Background(), draftCacheKey("synthetic-app", "v2.synthetic-http-loss"))
		if err == nil && record.Reply.Status == "succeeded" {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("receipt lost after client disconnect")
		}
		time.Sleep(5 * time.Millisecond)
	}
	lookup, _ := http.NewRequest("GET", server.URL+"/api/mp/draft/result", nil)
	lookup.Header.Set("Authorization", "Bearer "+testKey)
	lookup.Header.Set("Idempotency-Key", "v2.synthetic-http-loss")
	response, err := server.Client().Do(lookup)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	var reply SyncDraftReply
	err = json.NewDecoder(response.Body).Decode(&reply)
	if err != nil || response.StatusCode != 200 || reply.ProviderSuccess == nil || !*reply.ProviderSuccess || p.adds.Load() != 1 {
		t.Fatal("lost response not recoverable", err)
	}
}

func TestSyncDraftConfigurationValidation(t *testing.T) {
	t.Setenv("BACKEND_ACCESS_KEY", testKey)
	t.Setenv("MYSQL_DSN", "synthetic-no-connection")
	t.Setenv("WECHAT_APP_ID", "")
	t.Setenv("WECHAT_APP_SECRET", "")
	t.Setenv("CORS_ORIGINS", "")
	t.Setenv("MP_DRAFT_MODE", "")
	t.Setenv("MP_REDIS_URL", "")
	t.Setenv("MP_DRAFT_CACHE_TTL", "")
	config, err := LoadConfig()
	if err != nil || config.DraftMode != "legacy" || config.DraftCacheTTL != 24*time.Hour {
		t.Fatal("unsafe default", err)
	}
	t.Setenv("MP_DRAFT_MODE", "sync")
	if _, err = LoadConfig(); err == nil {
		t.Fatal("sync accepted without Redis")
	}
	t.Setenv("MP_REDIS_URL", "redis://127.0.0.1:1/15")
	if _, err = LoadConfig(); err != nil {
		t.Fatal(err)
	}
	t.Setenv("MP_DRAFT_CACHE_TTL", "10s")
	if _, err = LoadConfig(); err == nil {
		t.Fatal("short TTL allowed takeover of a running request")
	}
	if _, err = NewRedisDraftCache("invalid://SYNTHETIC_SECRET"); err == nil || strings.Contains(err.Error(), "SYNTHETIC_SECRET") {
		t.Fatal("invalid Redis credentials leaked")
	}
}
