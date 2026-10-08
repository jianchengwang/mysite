package app

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

const (
	TTSMaxText           = 2000
	TTSMaxStyle          = 300
	TTSMaxAudio          = 8 << 20
	TTSTimeout           = 20 * time.Second
	TTSConcurrency       = 2
	TTSRequestsPerMinute = 10
)

var ttsVoices = []string{"mimo_default", "冰糖", "茉莉", "苏打", "白桦", "Mia", "Chloe", "Milo", "Dean"}

// TTSRequest is provider-neutral. Clients cannot supply credentials, models or upstream URLs.
type TTSRequest struct {
	Provider         string `json:"provider,omitempty"`
	Text             string `json:"text"`
	Voice            string `json:"voice,omitempty"`
	Format           string `json:"format,omitempty"`
	StyleInstruction string `json:"style_instruction,omitempty"`
}

func (r *TTSRequest) Validate() error {
	if r.Provider == "" {
		r.Provider = "mimo"
	}
	if r.Provider != "mimo" {
		return errors.New("provider must be mimo")
	}
	if !utf8.ValidString(r.Text) || strings.TrimSpace(r.Text) == "" || utf8.RuneCountInString(r.Text) > TTSMaxText {
		return errors.New("text must contain 1–2000 Unicode characters")
	}
	if !utf8.ValidString(r.StyleInstruction) || utf8.RuneCountInString(r.StyleInstruction) > TTSMaxStyle {
		return errors.New("style_instruction must contain at most 300 Unicode characters")
	}
	if r.Voice == "" {
		r.Voice = "mimo_default"
	}
	allowed := false
	for _, voice := range ttsVoices {
		if r.Voice == voice {
			allowed = true
		}
	}
	if !allowed {
		return errors.New("unsupported preset voice; see GET /api/tts/capabilities")
	}
	if r.Format == "" {
		r.Format = "wav"
	}
	if r.Format != "wav" {
		return errors.New("format must be wav")
	}
	return nil
}

// Providers must honor context cancellation and return sanitized errors.
type TTSProvider interface {
	Synthesize(context.Context, TTSRequest) ([]byte, error)
}

var (
	errTTSUpstream    = errors.New("TTS provider unavailable")
	errTTSResponse    = errors.New("TTS provider returned invalid audio")
	errTTSQuota       = errors.New("TTS provider rate limit reached")
	errTTSCredentials = errors.New("TTS provider rejected server credentials")
)

// Limits are shared across all callers of one server process, independent of spoofable IP headers.
type TTSService struct {
	provider TTSProvider
	slots    chan struct{}
	mu       sync.Mutex
	starts   []time.Time
}

func NewTTSService(provider TTSProvider) *TTSService {
	return &TTSService{provider: provider, slots: make(chan struct{}, TTSConcurrency)}
}

func (s *Server) ttsCapabilities(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, 200, map[string]any{
		"provider": "mimo", "configured": s.TTS != nil && s.TTS.provider != nil,
		"voices": ttsVoices, "formats": []string{"wav"}, "max_text_characters": TTSMaxText,
		"max_style_characters": TTSMaxStyle, "timeout_seconds": int(TTSTimeout.Seconds()),
		"max_concurrent_requests": TTSConcurrency, "requests_per_minute": TTSRequestsPerMinute,
	})
}

func (s *Server) synthesizeTTS(w http.ResponseWriter, r *http.Request) {
	mediaType, _, mediaErr := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if mediaErr != nil || mediaType != "application/json" {
		problem(w, 415, "Content-Type must be application/json")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
	defer r.Body.Close()
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	var req TTSRequest
	if e := d.Decode(&req); e != nil {
		problem(w, 400, "invalid or oversized JSON")
		return
	}
	if d.Decode(new(any)) != io.EOF {
		problem(w, 400, "request must contain one JSON object")
		return
	}
	if e := req.Validate(); e != nil {
		problem(w, 400, e.Error())
		return
	}
	t := s.TTS
	if t == nil || t.provider == nil {
		problem(w, 503, "TTS is not configured on the server")
		return
	}
	select {
	case t.slots <- struct{}{}:
		defer func() { <-t.slots }()
	default:
		w.Header().Set("Retry-After", "2")
		problem(w, 429, "TTS concurrency limit reached")
		return
	}
	now := time.Now()
	t.mu.Lock()
	for len(t.starts) > 0 && now.Sub(t.starts[0]) >= time.Minute {
		t.starts = t.starts[1:]
	}
	if len(t.starts) >= TTSRequestsPerMinute {
		t.mu.Unlock()
		w.Header().Set("Retry-After", "60")
		problem(w, 429, "TTS request rate limit reached")
		return
	}
	t.starts = append(t.starts, now)
	t.mu.Unlock()
	ctx, cancel := context.WithTimeout(r.Context(), TTSTimeout)
	defer cancel()
	audio, e := t.provider.Synthesize(ctx, req)
	if e != nil {
		status, detail := 502, "TTS provider unavailable; generation may have been billed; no automatic retry"
		switch {
		case errors.Is(e, context.DeadlineExceeded), errors.Is(ctx.Err(), context.DeadlineExceeded):
			status, detail = 504, "TTS provider timed out; generation may have been billed; no automatic retry"
		case errors.Is(e, errTTSQuota):
			status, detail = 429, "TTS provider rate limit reached"
			w.Header().Set("Retry-After", "60")
		case errors.Is(e, errTTSCredentials):
			status, detail = 503, "TTS provider rejected server credentials"
		case errors.Is(e, errTTSResponse):
			detail = "TTS provider returned invalid audio"
		}
		// Never log text, audio, keys, HTTP headers, response bodies or raw errors.
		slog.Warn("TTS failed", "provider", "mimo", "status", status)
		problem(w, status, detail)
		return
	}
	if len(audio) > TTSMaxAudio || !validWAV(audio) {
		problem(w, 502, "TTS provider returned invalid audio")
		return
	}
	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Content-Disposition", `attachment; filename="speech.wav"`)
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-TTS-Provider", req.Provider)
	_, _ = w.Write(audio)
}
