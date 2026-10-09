package app

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestDraftProviderFailuresAndReceiptsWithoutRealNetwork(t *testing.T) {
	cases := []struct {
		name, endpoint, body, status, stage string
		httpStatus, code                    int
		delay                               bool
		retryable, success                  bool
	}{
		{name: "token_ip_40164", endpoint: "token", body: `{"errcode":40164,"errmsg":"SYNTHETIC_SECRET 203.0.113.42"}`, httpStatus: 200, code: 40164, status: "failed", stage: "token"},
		{name: "token_invalid_40001", endpoint: "token", body: `{"errcode":40001,"errmsg":"SYNTHETIC_SECRET"}`, httpStatus: 200, code: 40001, status: "failed", stage: "token"},
		{name: "token_missing_receipt", endpoint: "token", body: `{"errcode":0}`, httpStatus: 200, status: "failed", stage: "token"},
		{name: "token_http_5xx", endpoint: "token", body: `bad gateway SYNTHETIC_SECRET`, httpStatus: 503, status: "failed", stage: "token", retryable: true},
		{name: "token_timeout", endpoint: "token", body: `{}`, httpStatus: 200, delay: true, status: "failed", stage: "token", retryable: true},
		{name: "upload_ip_40164", endpoint: "upload", body: `{"errcode":40164,"errmsg":"SYNTHETIC_SECRET"}`, httpStatus: 200, code: 40164, status: "failed", stage: "upload_cover_pending"},
		{name: "draft_expired_40001", endpoint: "draft", body: `{"errcode":40001,"errmsg":"SYNTHETIC_SECRET","media_id":"ignored-id"}`, httpStatus: 200, code: 40001, status: "failed", stage: "draft_add_pending"},
		{name: "draft_timeout", endpoint: "draft", body: `{}`, httpStatus: 200, delay: true, status: "needs_reconciliation", stage: "draft_add_pending"},
		{name: "draft_http_5xx", endpoint: "draft", body: `bad gateway SYNTHETIC_SECRET`, httpStatus: 503, status: "needs_reconciliation", stage: "draft_add_pending"},
		{name: "draft_http_5xx_with_receipt", endpoint: "draft", body: `{"media_id":"unconfirmed-id"}`, httpStatus: 503, status: "needs_reconciliation", stage: "draft_add_pending"},
		{name: "draft_missing_media_id", endpoint: "draft", body: `{}`, httpStatus: 200, status: "needs_reconciliation", stage: "draft_add_pending"},
		{name: "draft_blank_media_id", endpoint: "draft", body: `{"media_id":" "}`, httpStatus: 200, status: "needs_reconciliation", stage: "draft_add_pending"},
		{name: "draft_numeric_media_id", endpoint: "draft", body: `{"media_id":123}`, httpStatus: 200, status: "needs_reconciliation", stage: "draft_add_pending"},
		{name: "draft_invalid_errcode", endpoint: "draft", body: `{"errcode":"bad","media_id":"not-confirmed"}`, httpStatus: 200, status: "needs_reconciliation", stage: "draft_add_pending"},
		{name: "draft_success", endpoint: "draft", body: `{"media_id":"valid-draft-id"}`, httpStatus: 200, status: "succeeded", stage: "draft_add_confirmed", success: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var tokens, uploads, drafts atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				endpoint := ""
				switch r.URL.Path {
				case "/cgi-bin/stable_token":
					tokens.Add(1)
					endpoint = "token"
				case "/cgi-bin/material/add_material":
					uploads.Add(1)
					endpoint = "upload"
				case "/cgi-bin/draft/add":
					drafts.Add(1)
					endpoint = "draft"
				default:
					t.Errorf("unexpected local stub path %s", r.URL.Path)
					w.WriteHeader(404)
					return
				}
				if endpoint == tc.endpoint {
					if tc.delay {
						time.Sleep(60 * time.Millisecond)
					}
					w.WriteHeader(tc.httpStatus)
					_, _ = io.WriteString(w, tc.body)
					return
				}
				if endpoint == "token" {
					_, _ = io.WriteString(w, `{"access_token":"SYNTHETIC_TOKEN","expires_in":7200}`)
				} else {
					_, _ = io.WriteString(w, `{"media_id":"valid-cover-id"}`)
				}
			}))
			defer server.Close()
			publisher := NewWeChat("synthetic-app", "SYNTHETIC_SECRET")
			publisher.BaseURL = server.URL
			publisher.Client = server.Client()
			if tc.delay {
				publisher.Client.Timeout = 15 * time.Millisecond
			}
			store := newStore()
			task := workerTask(t, store)
			var logs bytes.Buffer
			worker := Worker{AccountID: "synthetic-app", Store: store, Publisher: publisher, Images: SafeImageClient(), Logger: slog.New(slog.NewJSONHandler(&logs, nil))}
			worker.process(context.Background(), task)
			got, _ := store.Get(context.Background(), task.ID)
			response := draftResponse(got)
			if got.Status != tc.status || response.Stage != tc.stage || response.ProviderSuccess != tc.success || response.Retryable != tc.retryable || response.Attempt != 1 || response.Time.IsZero() || response.TaskID != task.ID {
				t.Fatalf("wrong receipt %+v", response)
			}
			if tc.code != 0 && (response.ProviderErrcode == nil || *response.ProviderErrcode != tc.code) {
				t.Fatalf("provider code lost %+v", response)
			}
			if tc.code == 0 && response.ProviderErrcode != nil && *response.ProviderErrcode != 0 {
				t.Fatal("invented provider error")
			}
			if tokens.Load() != 1 || drafts.Load() > 1 || uploads.Load() > 1 {
				t.Fatal("unexpected automatic retries")
			}
			if tc.endpoint == "token" && (uploads.Load() != 0 || drafts.Load() != 0) {
				t.Fatal("writes followed a token failure")
			}
			if tc.endpoint == "upload" && drafts.Load() != 0 {
				t.Fatal("draft followed an upload failure")
			}
			if again, _ := store.Claim(context.Background()); again != nil {
				t.Fatal("terminal task requeued")
			}
			var request DraftRequest
			_ = json.Unmarshal(task.Payload, &request)
			h := (&Server{Config: Config{APIKey: testKey, AppID: "synthetic-app", AppSecret: "SYNTHETIC_SECRET"}, Store: store}).Handler()
			get := httptest.NewRequest("GET", "/api/tasks/"+task.ID, nil)
			get.Header.Set("Authorization", "Bearer "+testKey)
			out := httptest.NewRecorder()
			h.ServeHTTP(out, get)
			if out.Code != 200 {
				t.Fatal(out.Code)
			}
			var decoded draftTaskResponse
			_ = json.Unmarshal(out.Body.Bytes(), &decoded)
			if decoded.Status != tc.status || decoded.ProviderSuccess != tc.success || !decoded.Terminal || !decoded.Accepted || decoded.Stage != tc.stage {
				t.Fatalf("HTTP status mistaken for provider success: %s", out.Body.String())
			}
			// Same idempotency key must return the same terminal task, without a second write.
			repeated, fresh, e := store.Reserve(context.Background(), "synthetic-worker", "hash", task.Payload)
			if e != nil || fresh || repeated.ID != task.ID {
				t.Fatal("idempotency lost")
			}
			all := logs.String() + out.Body.String()
			for _, secret := range []string{"SYNTHETIC_SECRET", "SYNTHETIC_TOKEN", "203.0.113.42", "access_token=", "/cgi-bin/"} {
				if strings.Contains(all, secret) {
					t.Fatal("diagnostic leaked sensitive provider details")
				}
			}
			for _, line := range strings.Split(strings.TrimSpace(logs.String()), "\n") {
				var row map[string]any
				if json.Unmarshal([]byte(line), &row) != nil {
					t.Fatal("unstructured log")
				}
				for _, key := range []string{"task_id", "stage", "status", "provider_errcode", "redacted_message", "retryable", "attempt", "event_time"} {
					if _, ok := row[key]; !ok {
						t.Fatalf("log omitted %s", key)
					}
				}
			}
		})
	}
}

func TestAcceptedQueueAndNotAcceptedRequestAreDistinct(t *testing.T) {
	store := newStore()
	h := (&Server{Config: Config{APIKey: testKey, AppID: "synthetic-app", AppSecret: "synthetic-secret"}, Store: store}).Handler()
	for _, invalid := range []bool{false, true} {
		payload := body()
		if invalid {
			payload = `{"title":"","content":"x"}`
		}
		request := httptest.NewRequest("POST", "/api/mp/draft", strings.NewReader(payload))
		request.Header.Set("Authorization", "Bearer "+testKey)
		request.Header.Set("Idempotency-Key", "synthetic-draft-key-123")
		out := httptest.NewRecorder()
		h.ServeHTTP(out, request)
		var row map[string]any
		_ = json.Unmarshal(out.Body.Bytes(), &row)
		if row["provider_success"] != false {
			t.Fatal("accepted request was called provider success")
		}
		if invalid {
			if out.Code != 400 || row["accepted"] != false || row["task_id"] != nil || row["status"] != "not_accepted" {
				t.Fatal(row)
			}
		} else {
			if out.Code != 202 || row["accepted"] != true || row["status"] != "queued" || row["attempt"] != float64(0) || row["poll_url"] == nil {
				t.Fatal(row)
			}
		}
	}
}

func TestLegacySucceededWithoutValidMediaIDIsNotProviderSuccess(t *testing.T) {
	response := draftResponse(Task{ID: strings.Repeat("a", 32), Status: "succeeded", Result: json.RawMessage(`{"article_count":1}`)})
	if response.ProviderSuccess || !strings.Contains(response.RedactedMessage, "reconciliation") {
		t.Fatal("fabricated legacy success")
	}
}
