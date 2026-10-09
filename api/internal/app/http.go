package app

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

var keyPattern = regexp.MustCompile(`^[A-Za-z0-9._-]{16,128}$`)
var taskPattern = regexp.MustCompile(`^[a-f0-9]{32}$`)

type Server struct {
	Config    Config
	Store     Store
	Content   ContentStore
	TTS       *TTSService
	SyncDraft *SyncDraftService
}

func jsonResponse(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func problem(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]string{"detail": message})
}
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health/live", func(w http.ResponseWriter, r *http.Request) { jsonResponse(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /health/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		if s.Store.Ping(ctx) != nil {
			problem(w, 503, "database unavailable")
			return
		}
		if s.Config.DraftMode == "sync" && (s.SyncDraft == nil || s.SyncDraft.Cache.Ping(ctx) != nil) {
			problem(w, 503, "receipt cache unavailable")
			return
		}
		jsonResponse(w, 200, map[string]string{"status": "ready"})
	})
	mux.HandleFunc("POST /api/mp/draft", s.createDraft)
	mux.HandleFunc("POST /api/mp/draft/update", s.updateDraftContent)
	mux.HandleFunc("GET /api/mp/draft/result", s.syncDraftResult)
	mux.HandleFunc("GET /api/mp/draft/capabilities", func(w http.ResponseWriter, r *http.Request) {
		mode := s.Config.DraftMode
		if mode == "" {
			mode = "legacy"
		}
		version := 1
		if mode == "sync" {
			version = 2
		}
		prefix := ""
		if mode == "sync" {
			prefix = "v2."
		}
		jsonResponse(w, 200, map[string]any{"content_only_update_schema": "content_only_cas_v1", "content_only_update_path": "/api/mp/draft/update", "update_precondition": "fresh_content_sha256_not_provider_atomic_cas", "idempotency_guarantee": "while_receipt_retained", "receipt_absence_allows_retry": false, "provider_write_auto_retry": false, "idempotency_key_prefix": prefix, "mode": mode, "api_version": version, "requires_version_header": mode == "sync", "legacy_tasks_readable": true, "idempotency_retention_seconds": int64(s.Config.DraftCacheTTL / time.Second)})
	})
	mux.HandleFunc("GET /api/mp/draft/diagnostics", s.draftDiagnostics)
	mux.HandleFunc("GET /api/tasks/{id}", s.getTask)
	mux.HandleFunc("POST /api/tts", s.synthesizeTTS)
	mux.HandleFunc("GET /api/tts/capabilities", s.ttsCapabilities)
	mux.HandleFunc("GET /api/blog/content", func(w http.ResponseWriter, r *http.Request) {
		if s.Content == nil {
			problem(w, 503, "content store unavailable")
			return
		}
		rows, e := s.Content.ListContent(r.Context())
		if e != nil {
			problem(w, 503, "content store unavailable")
			return
		}
		jsonResponse(w, 200, rows)
	})
	mux.HandleFunc("GET /api/blog/content/{path...}", func(w http.ResponseWriter, r *http.Request) {
		if s.Content == nil {
			problem(w, 503, "content store unavailable")
			return
		}
		item, e := s.Content.GetContent(r.Context(), r.PathValue("path"))
		if errors.Is(e, sql.ErrNoRows) {
			problem(w, 404, "content not found")
			return
		}
		if e != nil {
			problem(w, 503, "content store unavailable")
			return
		}
		jsonResponse(w, 200, item)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		if origin := r.Header.Get("Origin"); origin != "" {
			allowed := false
			for _, v := range s.Config.Origins {
				if origin == v {
					allowed = true
				}
			}
			if !allowed {
				problem(w, 403, "origin not allowed")
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key, X-Backend-Key, X-MP-Draft-API")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		if strings.HasPrefix(r.URL.Path, "/api/") {
			// Query credentials are deliberately unsupported; no fail-open configuration.
			provided := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
				provided = r.Header.Get("X-Backend-Key")
			}
			got, want := sha256.Sum256([]byte(provided)), sha256.Sum256([]byte(s.Config.APIKey))
			if len(s.Config.APIKey) < 32 || provided == "" || subtle.ConstantTimeCompare(got[:], want[:]) != 1 {
				w.Header().Set("WWW-Authenticate", "Bearer")
				problem(w, 401, "authentication required")
				return
			}
		}
		mux.ServeHTTP(w, r)
	})
}
func (s *Server) createDraft(w http.ResponseWriter, r *http.Request) {
	if s.Config.DraftMode == "sync" {
		s.createSyncDraft(w, r)
		return
	}
	if s.Config.AppID == "" || s.Config.AppSecret == "" {
		draftProblem(w, 503, "WeChat is not configured on the server")
		return
	}
	key := r.Header.Get("Idempotency-Key")
	if !keyPattern.MatchString(key) {
		draftProblem(w, 400, "Idempotency-Key must be 16–128 letters, digits, dots, underscores or hyphens")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8<<20)
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var payload DraftRequest
	if e := decoder.Decode(&payload); e != nil {
		draftProblem(w, 400, "invalid or oversized JSON; client access_token is no longer accepted")
		return
	}
	if decoder.Decode(new(any)) != io.EOF {
		draftProblem(w, 400, "request must contain one JSON object")
		return
	}
	if e := payload.Validate(); e != nil {
		draftProblem(w, 400, e.Error())
		return
	}
	data, _ := json.Marshal(payload)
	hash := sha256.Sum256(append([]byte(s.Config.AppID+"\x00"), data...))
	task, created, e := s.Store.Reserve(r.Context(), key, hex.EncodeToString(hash[:]), data)
	if errors.Is(e, ErrConflict) {
		draftProblem(w, 409, e.Error())
		return
	}
	if e != nil {
		draftProblem(w, 503, "could not persist task; retry only with the same Idempotency-Key")
		return
	}
	w.Header().Set("Location", "/api/tasks/"+task.ID)
	w.Header().Set("Retry-After", "2")
	status := http.StatusAccepted
	if !created {
		status = http.StatusOK
	}
	view := draftResponse(task)
	logDraft(nil, DraftDiagnostic{TaskID: task.ID, Stage: view.Stage, Status: task.Status, ProviderErrcode: view.ProviderErrcode, ProviderHTTPStatus: view.ProviderHTTPStatus, RedactedMessage: view.RedactedMessage, Retryable: view.Retryable, Attempt: view.Attempt, Time: time.Now().UTC()})
	jsonResponse(w, status, view)
}
func (s *Server) getTask(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !taskPattern.MatchString(id) {
		problem(w, 404, "task not found")
		return
	}
	t, e := s.Store.Get(r.Context(), id)
	if errors.Is(e, ErrNotFound) {
		problem(w, 404, "task not found")
		return
	}
	if e != nil {
		problem(w, 503, "task store unavailable")
		return
	}
	jsonResponse(w, 200, draftResponse(t))
}
func HTTPServer(address string, h http.Handler) *http.Server {
	return &http.Server{Addr: address, Handler: h, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10}
}
