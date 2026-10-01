package app

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"golang.org/x/net/html"
	"image"
	"image/png"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

const testKey = "synthetic-test-key-not-a-secret-1234567890"

type memoryStore struct {
	media          map[string]string
	mu             sync.Mutex
	tasks          map[string]Task
	keys           map[string]string
	failCheckpoint bool
	failPing       bool
}

func newStore() *memoryStore {
	return &memoryStore{media: map[string]string{}, tasks: map[string]Task{}, keys: map[string]string{}}
}
func (s *memoryStore) Reserve(_ context.Context, key, hash string, payload json.RawMessage) (Task, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id, ok := s.keys[key]; ok {
		t := s.tasks[id]
		if t.RequestHash != hash {
			return t, false, ErrConflict
		}
		return t, false, nil
	}
	t := Task{DestinationAccountID: "synthetic-app", ID: newID(), Status: "queued", RequestHash: hash, Payload: payload}
	s.tasks[t.ID] = t
	s.keys[key] = t.ID
	return t, true, nil
}
func (s *memoryStore) Get(_ context.Context, id string) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.tasks[id]
	if !ok {
		return t, ErrNotFound
	}
	return t, nil
}
func (s *memoryStore) Claim(_ context.Context) (*Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, t := range s.tasks {
		if t.Status == "queued" {
			t.Status = "processing"
			s.tasks[id] = t
			return &t, nil
		}
	}
	return nil, nil
}
func (s *memoryStore) Checkpoint(_ context.Context, id, stage string, result json.RawMessage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failCheckpoint {
		return errors.New("synthetic database failure")
	}
	t := s.tasks[id]
	t.Stage = stage
	t.Result = append([]byte(nil), result...)
	s.tasks[id] = t
	return nil
}
func (s *memoryStore) Finish(_ context.Context, id, status string, result json.RawMessage, message string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := s.tasks[id]
	t.Status = status
	t.Result = result
	t.Error = message
	s.tasks[id] = t
	return nil
}
func (s *memoryStore) ReconcileExpired(context.Context) error { return nil }
func (s *memoryStore) Ping(context.Context) error {
	if s.failPing {
		return errors.New("unavailable")
	}
	return nil
}
func request(t *testing.T, h http.Handler, body, key, auth string) *httptest.ResponseRecorder {
	t.Helper()
	r := httptest.NewRequest("POST", "/api/mp/draft", strings.NewReader(body))
	if key != "" {
		r.Header.Set("Idempotency-Key", key)
	}
	if auth != "" {
		r.Header.Set("Authorization", "Bearer "+auth)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}
func handler(s Store) http.Handler {
	return (&Server{Config: Config{APIKey: testKey, AppID: "synthetic-app", AppSecret: "synthetic-only", Origins: []string{"https://site.example"}}, Store: s}).Handler()
}
func body() string { return `{"title":"Synthetic test","content":"<p>Test</p>","show_cover_pic":1}` }
func TestAuthenticationNeverFailsOpen(t *testing.T) {
	for _, key := range []string{"", "short", testKey} {
		h := (&Server{Config: Config{APIKey: key}, Store: newStore()}).Handler()
		r := httptest.NewRequest("POST", "/api/mp/draft?backend_key="+key, strings.NewReader(body()))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 401 {
			t.Fatalf("query credentials or missing config accepted: %d", w.Code)
		}
	}
}
func TestCreateIdempotencyConflictAndTaskRead(t *testing.T) {
	s := newStore()
	h := handler(s)
	first := request(t, h, body(), "synthetic-request-1", testKey)
	if first.Code != 202 {
		t.Fatal(first.Code, first.Body.String())
	}
	second := request(t, h, body(), "synthetic-request-1", testKey)
	if second.Code != 200 {
		t.Fatal(second.Code)
	}
	if len(s.tasks) != 1 {
		t.Fatal("duplicate task")
	}
	conflict := request(t, h, strings.Replace(body(), "Synthetic test", "Different", 1), "synthetic-request-1", testKey)
	if conflict.Code != 409 {
		t.Fatal(conflict.Code)
	}
	var task Task
	_ = json.Unmarshal(first.Body.Bytes(), &task)
	r := httptest.NewRequest("GET", "/api/tasks/"+task.ID, nil)
	r.Header.Set("X-Backend-Key", testKey)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 || strings.Contains(w.Body.String(), "payload") {
		t.Fatal(w.Code, w.Body.String())
	}
}
func TestConcurrentDuplicateRequests(t *testing.T) {
	s := newStore()
	h := handler(s)
	var wg sync.WaitGroup
	for i := 0; i < 30; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			w := request(t, h, body(), "synthetic-concurrency", testKey)
			if w.Code != 200 && w.Code != 202 {
				t.Error(w.Code)
			}
		}()
	}
	wg.Wait()
	if len(s.tasks) != 1 {
		t.Fatal("not idempotent")
	}
}
func TestInputRejections(t *testing.T) {
	cases := []string{`{"title":"t","content":"x","access_token":"forbidden"}`, body() + body(), `{"title":"","content":"x"}`, `{"title":"x","content":"x","need_open_comment":2}`, `{"title":"x","content":"x","content_source_url":"javascript:bad"}`}
	for _, value := range cases {
		if w := request(t, handler(newStore()), value, "synthetic-request-1", testKey); w.Code != 400 {
			t.Fatal(w.Code)
		}
	}
	if w := request(t, handler(newStore()), body(), "", testKey); w.Code != 400 {
		t.Fatal(w.Code)
	}
}
func TestCORSAndReadiness(t *testing.T) {
	s := newStore()
	h := handler(s)
	for _, origin := range []string{"https://evil.example", "https://site.example"} {
		r := httptest.NewRequest("OPTIONS", "/api/mp/draft", nil)
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if origin == "https://evil.example" && w.Code != 403 {
			t.Fatal(w.Code)
		}
		if origin == "https://site.example" && (w.Code != 204 || w.Header().Get("Access-Control-Allow-Origin") != origin) {
			t.Fatal(w.Code)
		}
	}
	s.failPing = true
	r := httptest.NewRequest("GET", "/health/ready", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 503 {
		t.Fatal(w.Code)
	}
}
func TestSSRFAddressesAndURLs(t *testing.T) {
	for _, address := range []string{"127.0.0.1", "10.0.0.1", "169.254.169.254", "100.64.0.1", "192.168.1.2", "0.0.0.0", "::1", "fc00::1", "::ffff:127.0.0.1", "64:ff9b::a00:1", "2002:7f00:1::", "198.18.1.1"} {
		if PublicIP(net.ParseIP(address)) {
			t.Errorf("allowed %s", address)
		}
	}
	if !PublicIP(net.ParseIP("8.8.8.8")) {
		t.Fatal("public IP rejected")
	}
	for _, reference := range []string{"http://example.com/x.png", "https://127.0.0.1/x", "https://a:b@example.com/x", "https://example.com:444/x", "file:///etc/passwd", "https://localhost/x", "https://metadata.internal/x"} {
		if _, e := ValidateImageURL(reference); e == nil {
			t.Error(reference)
		}
	}
	if SafeImageClient().CheckRedirect(nil, nil) == nil {
		t.Fatal("redirect allowed")
	}
	if SafeImageClient().Transport.(*http.Transport).Proxy != nil {
		t.Fatal("proxy could bypass IP pinning")
	}
}
func pngData() string {
	im := image.NewRGBA(image.Rect(0, 0, 2, 2))
	var b bytes.Buffer
	_ = png.Encode(&b, im)
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(b.Bytes())
}
func TestImageDecode(t *testing.T) {
	image, e := LoadImage(context.Background(), nil, pngData())
	if e != nil || image.MIME != "image/png" {
		t.Fatal(e)
	}
	for _, value := range []string{"data:image/svg+xml;base64,PHN2Zy8+", "data:image/png;base64,YmFk", "data:image/png;base64," + strings.Repeat("A", 3<<20)} {
		if _, e = LoadImage(context.Background(), nil, value); e == nil {
			t.Fatal("invalid image accepted")
		}
	}
}

type fakePublisher struct {
	writes     int
	unknown    bool
	tokenCalls int
}

func (f *fakePublisher) Token(context.Context) (string, error) {
	f.tokenCalls++
	return "synthetic", nil
}
func (f *fakePublisher) Upload(context.Context, string, ImageData, bool) (string, error) {
	f.writes++
	return "https://mmbiz.qpic.cn/synthetic.png", nil
}
func (f *fakePublisher) AddDraft(context.Context, string, DraftRequest, string, string) (string, error) {
	f.writes++
	if f.unknown {
		return "", &RemoteError{true, "outcome unknown"}
	}
	return "synthetic-media-id", nil
}
func workerTask(t *testing.T, s *memoryStore) Task {
	t.Helper()
	d := DraftRequest{Title: "Synthetic", Content: "<p>Test</p>", CoverData: pngData()}
	data, _ := json.Marshal(d)
	task, _, _ := s.Reserve(context.Background(), "synthetic-worker", "hash", data)
	_, _ = s.Claim(context.Background())
	return task
}
func TestWorkerDurableOutcomesAndNoRetry(t *testing.T) {
	for _, unknown := range []bool{false, true} {
		s := newStore()
		task := workerTask(t, s)
		publisher := &fakePublisher{unknown: unknown}
		w := Worker{AccountID: "synthetic-app", Store: s, Publisher: publisher, Images: SafeImageClient()}
		w.process(context.Background(), task)
		got, _ := s.Get(context.Background(), task.ID)
		want := "succeeded"
		if unknown {
			want = "needs_reconciliation"
		}
		if got.Status != want {
			t.Fatal(got.Status, got.Error)
		}
		if publisher.writes != 2 {
			t.Fatal(publisher.writes)
		}
		if task, _ := s.Claim(context.Background()); task != nil {
			t.Fatal("terminal/unknown outcome requeued")
		}
		var result TaskResult
		_ = json.Unmarshal(got.Result, &result)
		if result.PreparedSHA256 == "" || result.PreparedContent == "" {
			t.Fatal("final content not durably checkpointed")
		}
	}
}
func TestCheckpointFailurePreventsRemoteWrite(t *testing.T) {
	s := newStore()
	task := workerTask(t, s)
	s.failCheckpoint = true
	p := &fakePublisher{}
	w := Worker{AccountID: "synthetic-app", Store: s, Publisher: p, Images: SafeImageClient()}
	w.process(context.Background(), task)
	if p.writes != 0 {
		t.Fatal("wrote despite failed checkpoint")
	}
	got, _ := s.Get(context.Background(), task.ID)
	if got.Status != "needs_reconciliation" {
		t.Fatal(got.Status)
	}
}
func TestHTMLCleaning(t *testing.T) {
	nodes, images, e := prepareHTML(`<script>bad()</script><p onclick="bad()">OK<img src="x" onerror="bad()"></p><iframe src="https://example.com"></iframe>`)
	if e != nil || len(images) != 1 {
		t.Fatal(e)
	}
	var b bytes.Buffer
	for _, n := range nodes {
		if e := html.Render(&b, n); e != nil {
			t.Fatal(e)
		}
	}
	for _, bad := range []string{"script", "onclick", "onerror", "iframe"} {
		if strings.Contains(b.String(), bad) {
			t.Fatal(b.String())
		}
	}
}
func TestWeChatTokenCachingAndWriteFailureClassification(t *testing.T) {
	tokenCalls, writes := 0, 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/cgi-bin/stable_token" {
			tokenCalls++
			_, _ = io.WriteString(w, `{"access_token":"synthetic-token","expires_in":7200}`)
			return
		}
		writes++
		if r.URL.Query().Get("type") != "image" || r.URL.Query().Get("access_token") != "synthetic-token" {
			t.Error("malformed upload query")
		}
		_, _ = io.WriteString(w, `{"errcode":40001,"errmsg":"do not leak secrets"}`)
	}))
	defer server.Close()
	client := NewWeChat("synthetic-app", "synthetic-secret")
	client.BaseURL = server.URL
	client.Client = server.Client()
	token, e := client.Token(context.Background())
	if e != nil {
		t.Fatal(e)
	}
	_, _ = client.Token(context.Background())
	if tokenCalls != 1 {
		t.Fatal("token not cached")
	}
	_, e = client.Upload(context.Background(), token, ImageData{Data: []byte("test"), Filename: "image.png"}, true)
	var remote *RemoteError
	if !errors.As(e, &remote) || remote.Unknown || strings.Contains(e.Error(), "secrets") {
		t.Fatal(e)
	}
	if writes != 1 {
		t.Fatal("blind retry")
	}
	client.expires = time.Now().Add(-time.Second)
	_, _ = client.Token(context.Background())
	if tokenCalls != 2 {
		t.Fatal("token not refreshed")
	}
}

func (s *memoryStore) ReserveMedia(_ context.Context, hash, purpose, task string) (string, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := hash + purpose
	if remote, ok := s.media[key]; ok {
		if remote == "" {
			return "", false, &RemoteError{true, "pending media"}
		}
		return remote, false, nil
	}
	s.media[key] = ""
	return "", true, nil
}
func (s *memoryStore) ConfirmMedia(_ context.Context, hash, purpose, task, remote string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.media[hash+purpose] = remote
	return nil
}
func (s *memoryStore) MarkMediaUnknown(context.Context, string, string, string) error { return nil }
func TestWorkerRefusesAccountChange(t *testing.T) {
	s := newStore()
	task := workerTask(t, s)
	p := &fakePublisher{}
	w := Worker{AccountID: "different-app", Store: s, Publisher: p, Images: SafeImageClient()}
	w.process(context.Background(), task)
	if p.writes != 0 || p.tokenCalls != 0 {
		t.Fatal("account mismatch caused remote call")
	}
	got, _ := s.Get(context.Background(), task.ID)
	if got.Status != "failed" {
		t.Fatal(got.Status)
	}
}
func TestMediaReusedAcrossTasksByHashAndPurpose(t *testing.T) {
	s := newStore()
	first := workerTask(t, s)
	p := &fakePublisher{}
	w := Worker{AccountID: "synthetic-app", Store: s, Publisher: p, Images: SafeImageClient()}
	w.process(context.Background(), first)
	second := first
	second.ID = newID()
	s.tasks[second.ID] = second
	w.process(context.Background(), second)
	if p.writes != 3 {
		t.Fatalf("want one cover upload + two draft writes, got %d", p.writes)
	}
	result, _ := s.Get(context.Background(), second.ID)
	if !strings.Contains(string(result.Result), `"reused":true`) {
		t.Fatal("missing reuse receipt")
	}
}

func TestCloudPreparedRequestContract(t *testing.T) {
	data, e := os.ReadFile("testdata/cloud-wechat-request.json")
	if e != nil {
		t.Fatal(e)
	}
	var fixture struct {
		Synthetic bool            `json:"synthetic"`
		Path      string          `json:"path"`
		Key       string          `json:"idempotency_key"`
		Body      json.RawMessage `json:"body"`
	}
	if e = json.Unmarshal(data, &fixture); e != nil {
		t.Fatal(e)
	}
	if !fixture.Synthetic || fixture.Path != "/api/mp/draft" {
		t.Fatal("wrong contract fixture")
	}
	s := newStore()
	h := handler(s)
	response := request(t, h, string(fixture.Body), fixture.Key, testKey)
	if response.Code != 202 {
		t.Fatal(response.Code, response.Body.String())
	}
	task, e := s.Claim(context.Background())
	if e != nil || task == nil {
		t.Fatal(e)
	}
	p := &fakePublisher{}
	worker := Worker{AccountID: "synthetic-app", Store: s, Publisher: p, Images: SafeImageClient()}
	worker.process(context.Background(), *task)
	done, _ := s.Get(context.Background(), task.ID)
	if done.Status != "succeeded" {
		t.Fatal(done.Status, done.Error)
	}
	var result TaskResult
	_ = json.Unmarshal(done.Result, &result)
	if strings.Contains(result.PreparedContent, "data:image") {
		t.Fatal("inline images were not replaced")
	}
	if p.writes != 4 {
		t.Fatalf("expected 2 inline, cover and draft writes; got %d", p.writes)
	}
	response = request(t, h, string(fixture.Body), fixture.Key, testKey)
	if response.Code != 200 || len(s.tasks) != 1 {
		t.Fatal("retry duplicated task")
	}
}
