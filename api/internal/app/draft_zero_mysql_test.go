package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// Any accidental business SQL access fails the test, even if it affects zero rows.
// All persistence methods include tasks, status/checkpoints, receipts and media/audit state.
type forbiddenDraftSQL struct{ *memoryStore }

func (forbiddenDraftSQL) Reserve(context.Context, string, string, json.RawMessage) (Task, bool, error) {
	panic("MP draft called SQL Reserve")
}
func (forbiddenDraftSQL) Claim(context.Context) (*Task, error) { panic("MP draft called SQL Claim") }
func (forbiddenDraftSQL) Checkpoint(context.Context, string, string, json.RawMessage) error {
	panic("MP draft called SQL Checkpoint")
}
func (forbiddenDraftSQL) Finish(context.Context, string, string, json.RawMessage, string) error {
	panic("MP draft called SQL Finish")
}
func (forbiddenDraftSQL) ReconcileExpired(context.Context) error {
	panic("MP draft called SQL ReconcileExpired")
}
func (forbiddenDraftSQL) ReserveMedia(context.Context, string, string, string) (string, bool, error) {
	panic("MP draft called SQL ReserveMedia")
}
func (forbiddenDraftSQL) ConfirmMedia(context.Context, string, string, string, string) error {
	panic("MP draft called SQL ConfirmMedia")
}
func (forbiddenDraftSQL) MarkMediaUnknown(context.Context, string, string, string) error {
	panic("MP draft called SQL MarkMediaUnknown")
}
func zeroSQLHandler(p SyncPublisher, c *syntheticDraftCache, accept context.Context) http.Handler {
	service := NewSyncDraftService(c, p, SafeImageClient(), time.Hour)
	service.AcceptContext = accept
	return (&Server{Config: Config{APIKey: testKey, AppID: "synthetic-app", AppSecret: "secret", DraftMode: "sync"}, Store: forbiddenDraftSQL{newStore()}, SyncDraft: service}).Handler()
}
func draftRouteRequest(h http.Handler, route, key, body string, auth, version bool) *httptest.ResponseRecorder {
	var data *strings.Reader
	if body == "" {
		data = strings.NewReader("")
	} else {
		data = strings.NewReader(body)
	}
	method := "POST"
	if strings.HasSuffix(route, "/result") {
		method = "GET"
	}
	r := httptest.NewRequest(method, route, data)
	if auth {
		r.Header.Set("X-Backend-Key", testKey)
	}
	if version {
		r.Header.Set("X-MP-Draft-API", "2")
	}
	r.Header.Set("Idempotency-Key", key)
	w := httptest.NewRecorder()
	h.ServeHTTP(deadlineRecorder{w}, r)
	return w
}
func TestSyncCreateAllOutcomesZeroMySQLWrites(t *testing.T) {
	for _, kind := range []string{"success_replay_lookup", "rejected", "unknown_replay_lookup", "auth", "version", "bad_json", "bad_key", "invalid_image", "cache_down", "lost_reserve_ack", "checkpoint", "final_cache_failure", "shutdown", "lookup_missing", "lookup_auth"} {
		t.Run(kind, func(t *testing.T) {
			p := &syntheticSyncPublisher{}
			c := &syntheticDraftCache{records: map[string]DraftCacheRecord{}}
			ctx := context.Background()
			body := synchronousBody()
			key := "v2.zero-sql-create-" + kind
			route := "/api/mp/draft"
			auth, version := true, true
			want := 200
			switch kind {
			case "rejected":
				code := 40001
				p.addError = providerFailure(false, &code, 200, false, "synthetic rejection")
				want = 502
			case "unknown_replay_lookup":
				p.addError = providerFailure(true, nil, 502, false, "synthetic unknown")
				want = 502
			case "auth":
				auth = false
				want = 401
			case "version":
				version = false
				want = 428
			case "bad_json":
				body = `{"audit":"forbidden"}`
				want = 400
			case "bad_key":
				key = "legacy-key-short"
				want = 400
			case "invalid_image":
				body = `{"title":"synthetic","content":"<p>text</p>","cover_data":"invalid"}`
				want = 400
			case "cache_down":
				c.down = true
				want = 503
			case "lost_reserve_ack":
				c.loseReserveReply = true
				want = 503
			case "checkpoint":
				c.failStage = "draft_add_pending"
				want = 503
			case "final_cache_failure":
				c.failFinal = true
			case "shutdown":
				var cancel context.CancelFunc
				ctx, cancel = context.WithCancel(ctx)
				cancel()
				want = 503
			case "lookup_missing":
				route += "/result"
				want = 404
			case "lookup_auth":
				route += "/result"
				auth = false
				want = 401
			}
			h := zeroSQLHandler(p, c, ctx)
			r := draftRouteRequest(h, route, key, body, auth, version)
			if r.Code != want {
				t.Fatal(kind, r.Code, r.Body.String())
			}
			if strings.Contains(kind, "replay_lookup") {
				r = draftRouteRequest(h, route, key, body, true, true)
				if r.Code != want {
					t.Fatal("replay", r.Code)
				}
				r = draftRouteRequest(h, "/api/mp/draft/result", key, "", true, true)
				if r.Code != want || p.adds.Load() != 1 {
					t.Fatal("lookup/replay issued another provider add")
				}
			}
		})
	}
}
func TestSyncUpdateAllOutcomesZeroMySQLWrites(t *testing.T) {
	for _, kind := range []string{"success_replay_lookup", "rejected", "unknown_replay_lookup", "precondition", "body_change", "auth", "version", "bad_json", "bad_key", "cache_down", "checkpoint", "final_cache_failure", "read_failure", "readback_failure", "metadata_conflict"} {
		t.Run(kind, func(t *testing.T) {
			_, p, c, _ := updateFixture()
			body := updateBody(updateNewHTML)
			auth, version := true, true
			key := "v2.layout.zero-sql-" + kind
			want := 200
			switch kind {
			case "rejected":
				code := 40001
				p.updateError = providerFailure(false, &code, 200, false, "synthetic rejection")
				want = 502
			case "unknown_replay_lookup":
				p.updateError = providerFailure(true, nil, 502, false, "synthetic unknown")
				want = 502
			case "precondition":
				p.article["content"] = json.RawMessage(`"User edit"`)
				want = 409
			case "body_change":
				body = updateBody(strings.Replace(updateNewHTML, "第二段", "replacement", 1))
				want = 400
			case "auth":
				auth = false
				want = 401
			case "version":
				version = false
				want = 428
			case "bad_json":
				body = `{"title":"forbidden"}`
				want = 400
			case "bad_key":
				key = "v2.unrelated.operation"
				want = 400
			case "cache_down":
				c.down = true
				want = 503
			case "checkpoint":
				c.failStage = "draft_update_pending"
				want = 503
			case "final_cache_failure":
				c.failFinal = true
			case "read_failure":
				p.readError = true
				want = 502
			case "readback_failure":
				p.readbackFail = true
				want = 502
			case "metadata_conflict":
				p.mutateMeta = true
				want = 409
			}
			h := zeroSQLHandler(p, c, context.Background())
			route := "/api/mp/draft/update"
			r := draftRouteRequest(h, route, key, body, auth, version)
			if r.Code != want {
				t.Fatal(kind, r.Code, r.Body.String())
			}
			if strings.Contains(kind, "replay_lookup") {
				r = draftRouteRequest(h, route, key, body, true, true)
				if r.Code != want {
					t.Fatal("update replay", r.Code)
				}
				r = draftRouteRequest(h, "/api/mp/draft/result", key, "", true, true)
				if r.Code != want || p.updates.Load() != 1 || p.adds.Load() != 0 {
					t.Fatal("update lookup/replay performed provider write")
				}
			}
		})
	}
}
