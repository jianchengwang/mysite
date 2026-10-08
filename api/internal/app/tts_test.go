package app

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type ttsFunc func(context.Context, TTSRequest) ([]byte, error)

func (f ttsFunc) Synthesize(ctx context.Context, r TTSRequest) ([]byte, error) { return f(ctx, r) }

type ttsTransport func(*http.Request) (*http.Response, error)

func (f ttsTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// Synthetic PCM silence used only as a fixture; never represents successful MiMo generation.
func mockWAV() []byte {
	b := make([]byte, 48)
	copy(b, "RIFF")
	binary.LittleEndian.PutUint32(b[4:], 40)
	copy(b[8:], "WAVEfmt ")
	binary.LittleEndian.PutUint32(b[16:], 16)
	binary.LittleEndian.PutUint16(b[20:], 1)
	binary.LittleEndian.PutUint16(b[22:], 1)
	binary.LittleEndian.PutUint32(b[24:], 24000)
	binary.LittleEndian.PutUint32(b[28:], 48000)
	binary.LittleEndian.PutUint16(b[32:], 2)
	binary.LittleEndian.PutUint16(b[34:], 16)
	copy(b[36:], "data")
	binary.LittleEndian.PutUint32(b[40:], 4)
	return b
}
func ttsRequest(h http.Handler, body, key string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("POST", "/api/tts", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	if key != "" {
		r.Header.Set("Authorization", "Bearer "+key)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}
func ttsHandler(p TTSProvider) http.Handler {
	return (&Server{Config: Config{APIKey: testKey}, Store: newStore(), TTS: NewTTSService(p)}).Handler()
}

const goodTTSJSON = `{"text":"你好，Mini。","voice":"冰糖"}`

func TestTTSAuthenticationAndDisabled(t *testing.T) {
	var calls atomic.Int32
	h := ttsHandler(ttsFunc(func(context.Context, TTSRequest) ([]byte, error) { calls.Add(1); return mockWAV(), nil }))
	for _, key := range []string{"", "wrong-key"} {
		if w := ttsRequest(h, goodTTSJSON, key); w.Code != 401 {
			t.Fatal(w.Code)
		}
	}
	if calls.Load() != 0 {
		t.Fatal("unauthenticated generation")
	}
	for _, path := range []string{"/api/tts/capabilities", "/api/tts?access_key=" + testKey} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 401 {
			t.Fatalf("unauthenticated %s: %d", path, w.Code)
		}
	}
	r := httptest.NewRequest("POST", "/api/tts", strings.NewReader(goodTTSJSON))
	r.Header.Set("X-Backend-Key", testKey)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatal("existing X-Backend-Key auth failed")
	}
	if w := ttsRequest(ttsHandler(nil), goodTTSJSON, testKey); w.Code != 503 {
		t.Fatal(w.Code)
	}
	if NewMiMoTTS("") != nil {
		t.Fatal("missing credentials must disable TTS")
	}
	h = ttsHandler(nil)
	r = httptest.NewRequest("GET", "/api/tts/capabilities", nil)
	r.Header.Set("Authorization", "Bearer "+testKey)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"configured":false`) {
		t.Fatal(w.Body.String())
	}
}

func TestTTSValidationAndSuccess(t *testing.T) {
	var calls atomic.Int32
	h := ttsHandler(ttsFunc(func(ctx context.Context, r TTSRequest) ([]byte, error) {
		calls.Add(1)
		if r.Provider != "mimo" || r.Format != "wav" || r.Text != "你好，Mini。" {
			t.Error(r)
		}
		deadline, ok := ctx.Deadline()
		if !ok || time.Until(deadline) > TTSTimeout {
			t.Error("missing bounded deadline")
		}
		return mockWAV(), nil
	}))
	for _, body := range []string{
		`{}`, `null`, `[]`, `{"text":"   "}`, `{"text":"x","voice":"https://attacker.invalid"}`,
		`{"text":"x","provider":"other"}`, `{"text":"x","format":"pcm16"}`, `{"text":"x","api_key":"secret"}`,
		`{"text":"x","base_url":"https://attacker.invalid"}`, `{"text":"x","model":"other"}`,
		goodTTSJSON + ` {}`, `{"text":"` + strings.Repeat("汉", 2001) + `"}`,
		`{"text":"x","style_instruction":"` + strings.Repeat("汉", 301) + `"}`,
		`{"text":"` + strings.Repeat("x", 17000) + `"}`,
	} {
		if w := ttsRequest(h, body, testKey); w.Code != 400 {
			t.Errorf("invalid request status %d", w.Code)
		}
	}
	if calls.Load() != 0 {
		t.Fatal("invalid request called provider")
	}
	w := ttsRequest(h, goodTTSJSON, testKey)
	if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), mockWAV()) || w.Header().Get("Content-Type") != "audio/wav" || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal(w)
	}
	if calls.Load() != 1 {
		t.Fatal(calls.Load())
	}
}

func TestTTSErrorsAreSanitized(t *testing.T) {
	for _, tc := range []struct {
		err  error
		code int
	}{
		{errors.New("api-key secret and private text"), 502}, {context.DeadlineExceeded, 504},
		{errTTSCredentials, 503}, {errTTSQuota, 429}, {errTTSResponse, 502},
	} {
		h := ttsHandler(ttsFunc(func(context.Context, TTSRequest) ([]byte, error) { return nil, tc.err }))
		w := ttsRequest(h, goodTTSJSON, testKey)
		if w.Code != tc.code || strings.Contains(w.Body.String(), "private text") || strings.Contains(w.Body.String(), "secret") {
			t.Fatal(w)
		}
	}
	for _, data := range [][]byte{[]byte("not audio"), make([]byte, TTSMaxAudio+1)} {
		w := ttsRequest(ttsHandler(ttsFunc(func(context.Context, TTSRequest) ([]byte, error) { return data, nil })), goodTTSJSON, testKey)
		if w.Code != 502 {
			t.Fatal(w.Code)
		}
	}
}

func TestTTSRateAndConcurrency(t *testing.T) {
	h := ttsHandler(ttsFunc(func(context.Context, TTSRequest) ([]byte, error) { return mockWAV(), nil }))
	for i := 0; i < TTSRequestsPerMinute; i++ {
		if w := ttsRequest(h, goodTTSJSON, testKey); w.Code != 200 {
			t.Fatal(w.Code)
		}
	}
	if w := ttsRequest(h, goodTTSJSON, testKey); w.Code != 429 || w.Header().Get("Retry-After") == "" {
		t.Fatal(w)
	}
	entered := make(chan struct{}, 2)
	release := make(chan struct{})
	finished := make(chan int, 2)
	h = ttsHandler(ttsFunc(func(ctx context.Context, _ TTSRequest) ([]byte, error) {
		entered <- struct{}{}
		select {
		case <-release:
			return mockWAV(), nil
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}))
	for i := 0; i < 2; i++ {
		go func() { finished <- ttsRequest(h, goodTTSJSON, testKey).Code }()
	}
	for i := 0; i < 2; i++ {
		select {
		case <-entered:
		case <-time.After(time.Second):
			close(release)
			t.Fatal("not concurrent")
		}
	}
	w := ttsRequest(h, goodTTSJSON, testKey)
	close(release)
	if w.Code != 429 {
		t.Fatal(w.Code)
	}
	for i := 0; i < 2; i++ {
		if code := <-finished; code != 200 {
			t.Fatal(code)
		}
	}
}

func mimoResponse(status int, body string) *http.Response {
	return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}
}
func mimoAudioJSON(data []byte) string {
	b, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"finish_reason": "stop", "message": map[string]any{"audio": map[string]string{"data": base64.StdEncoding.EncodeToString(data)}}}}})
	return string(b)
}

func TestMiMoProtocolWithMockTransport(t *testing.T) {
	m := NewMiMoTTS("synthetic-mimo-test-key").(*mimoTTS)
	m.client.Transport = ttsTransport(func(r *http.Request) (*http.Response, error) {
		if r.URL.String() != mimoTTSEndpoint || r.Header.Get("api-key") != "synthetic-mimo-test-key" || r.Method != "POST" {
			t.Error("incorrect endpoint/auth")
		}
		var body map[string]any
		if json.NewDecoder(r.Body).Decode(&body) != nil {
			t.Fatal("invalid body")
		}
		if body["model"] != mimoTTSModel || body["stream"] != false {
			t.Error(body)
		}
		messages := body["messages"].([]any)
		if len(messages) != 2 || messages[0].(map[string]any)["role"] != "user" || messages[1].(map[string]any)["role"] != "assistant" || messages[1].(map[string]any)["content"] != "原文" {
			t.Error(messages)
		}
		audio := body["audio"].(map[string]any)
		if audio["format"] != "wav" || audio["voice"] != "mimo_default" {
			t.Error(audio)
		}
		return mimoResponse(200, mimoAudioJSON(mockWAV())), nil
	})
	r := TTSRequest{Text: "原文", StyleInstruction: "温和"}
	_ = r.Validate()
	b, e := m.Synthesize(context.Background(), r)
	if e != nil || !bytes.Equal(b, mockWAV()) {
		t.Fatal(e)
	}
	if e := m.client.CheckRedirect(nil, nil); e != http.ErrUseLastResponse {
		t.Fatal("redirects must be blocked")
	}
}

func TestMiMoMockUpstreamFailures(t *testing.T) {
	for _, tc := range []struct {
		status int
		body   string
		want   error
	}{
		{401, "secret raw body", errTTSCredentials}, {403, "secret", errTTSCredentials}, {429, "secret", errTTSQuota},
		{500, "secret", errTTSUpstream}, {302, "redirect", errTTSUpstream}, {200, "not json", errTTSResponse},
		{200, `{"error":{"message":"secret"}}`, errTTSResponse}, {200, `{"choices":[]}`, errTTSResponse},
		{200, `{"choices":[{"message":{"audio":{"data":"!!!"}}}]}`, errTTSResponse},
		{200, mimoAudioJSON([]byte("not WAV")), errTTSResponse},
		{200, strings.Replace(mimoAudioJSON(mockWAV()), `"stop"`, `"length"`, 1), errTTSResponse},
		{200, strings.Repeat(" ", 12<<20+1), errTTSResponse},
	} {
		m := NewMiMoTTS("synthetic").(*mimoTTS)
		m.client.Transport = ttsTransport(func(*http.Request) (*http.Response, error) { return mimoResponse(tc.status, tc.body), nil })
		if _, e := m.Synthesize(context.Background(), TTSRequest{Text: "x", Voice: "mimo_default", Format: "wav"}); !errors.Is(e, tc.want) {
			t.Errorf("status %d: %v", tc.status, e)
		}
	}
	m := NewMiMoTTS("synthetic").(*mimoTTS)
	m.client.Transport = ttsTransport(func(r *http.Request) (*http.Response, error) { <-r.Context().Done(); return nil, r.Context().Err() })
	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()
	if _, e := m.Synthesize(ctx, TTSRequest{}); !errors.Is(e, context.DeadlineExceeded) {
		t.Fatal(e)
	}
}

func TestWAVRejectsTruncation(t *testing.T) {
	b := mockWAV()
	if !validWAV(b) {
		t.Fatal("fixture")
	}
	for _, bad := range [][]byte{b[:47], append(append([]byte{}, b...), 0), make([]byte, 44)} {
		if validWAV(bad) {
			t.Fatal("invalid WAV accepted")
		}
	}
}
