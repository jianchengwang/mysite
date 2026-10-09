package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
"os"
"path/filepath"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type syntheticEditor struct {
	syntheticSyncPublisher
	article      map[string]json.RawMessage
	updates      atomic.Int32
	updateError  error
	readError    bool
	mutateMeta   bool
	readbackFail bool
}

func (e *syntheticEditor) GetDraft(context.Context, string, string) ([]map[string]json.RawMessage, error) {
	if e.readError || e.readbackFail && e.updates.Load() > 0 {
		return nil, errors.New("synthetic read failed")
	}
	copy := map[string]json.RawMessage{}
	for k, v := range e.article {
		copy[k] = v
	}
	return []map[string]json.RawMessage{copy}, nil
}
func (e *syntheticEditor) UpdateDraftContent(_ context.Context, _ string, _ string, _ int, a map[string]json.RawMessage) (ProviderReceipt, error) {
	e.updates.Add(1)
	if e.updateError != nil {
		return ProviderReceipt{}, e.updateError
	}
	e.article = a
	if e.mutateMeta {
		e.article["title"] = json.RawMessage(`"unexpected"`)
	}
	return ProviderReceipt{Errcode: new(int), HTTPStatus: 200}, nil
}

const updateOldHTML = `<p style="margin:0">甲 &amp; 乙</p><p>第二段</p><img src="https://example.test/image">`
const updateNewHTML = `<p style="margin:0 0 1.8em 0;line-height:1.8;font-size:16px;text-indent:0">甲 &amp; 乙</p><p style="margin:0 0 1.8em 0;line-height:1.8;font-size:16px;text-indent:0">第二段</p><img src="https://example.test/image">`

func updateFixture() (http.Handler, *syntheticEditor, *syntheticDraftCache, *memoryStore) {
	p := &syntheticEditor{article: map[string]json.RawMessage{}}
	for k, v := range map[string]any{"title": "SYNTHETIC_TITLE", "author": "author", "digest": "SYNTHETIC_DIGEST", "thumb_media_id": "SYNTHETIC_THUMB", "content": updateOldHTML, "show_cover_pic": 1, "need_open_comment": 1, "only_fans_can_comment": 0, "url": "https://temporary.test/old", "thumb_url": "https://temporary.test/thumb", "cover_crop_img": map[string]any{"x": 0.5}} {
		p.article[k], _ = json.Marshal(v)
	}
	c := &syntheticDraftCache{records: map[string]DraftCacheRecord{}}
	store := newStore()
	service := NewSyncDraftService(c, p, SafeImageClient(), time.Hour)
	return (&Server{Config: Config{APIKey: testKey, AppID: "synthetic-app", AppSecret: "secret", DraftMode: "sync"}, Store: store, SyncDraft: service}).Handler(), p, c, store
}
func updateBody(content string) string {
	h := sha256.Sum256([]byte(updateOldHTML))
	data, _ := json.Marshal(ContentUpdateRequest{MediaID: "SYNTHETIC_DRAFT_ID", Index: 0, ExpectedContentSHA256: hex.EncodeToString(h[:]), Content: content})
	return string(data)
}
func updateRequest(h http.Handler, key, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("POST", "/api/mp/draft/update", strings.NewReader(body))
	r.Header.Set("X-Backend-Key", testKey)
	r.Header.Set("X-MP-Draft-API", "2")
	r.Header.Set("Idempotency-Key", key)
	w := httptest.NewRecorder()
	h.ServeHTTP(deadlineRecorder{w}, r)
	return w
}
func TestContentUpdatePreservesMetadataAndReplays(t *testing.T) {
	h, p, c, store := updateFixture()
	meta := articleMetadata(p.article)
	one := updateRequest(h, "v2.update.synthetic-ok", updateBody(updateNewHTML))
	reply := syncReply(t, one)
	if one.Code != 200 || reply.MediaID != "SYNTHETIC_DRAFT_ID" || reply.ProviderSuccess == nil || !*reply.ProviderSuccess || !reflect.DeepEqual(meta, articleMetadata(p.article)) {
		t.Fatal(one.Body.String())
	}
	two := updateRequest(h, "v2.update.synthetic-ok", updateBody(updateNewHTML))
	if two.Code != 200 || p.updates.Load() != 1 || p.adds.Load() != 0 || p.uploads.Load() != 0 || len(store.tasks) > 0 || len(store.media) > 0 {
		t.Fatal("update replay or SQL invariant")
	}
	for _, v := range c.records {
		raw, _ := json.Marshal(v)
		for _, forbidden := range []string{"SYNTHETIC_TITLE", "SYNTHETIC_DIGEST", "甲", "<p", "content\""} {
			if strings.Contains(string(raw), forbidden) {
				t.Fatal("body/metadata in Redis")
			}
		}
	}
}
func TestContentUpdateConflictAndBodyChangesStopBeforeWrite(t *testing.T) {
	for _, kind := range []string{"cas", "text", "image", "structure", "read", "checkpoint", "unknown-field"} {
		t.Run(kind, func(t *testing.T) {
			h, p, c, _ := updateFixture()
			body := updateBody(updateNewHTML)
			want := 400
			switch kind {
			case "cas":
				p.article["content"] = json.RawMessage(`"user edit"`)
				want = 409
			case "text":
				body = updateBody(strings.Replace(updateNewHTML, "第二段", "新正文", 1))
			case "image":
				body = updateBody(strings.Replace(updateNewHTML, "example.test/image", "example.test/changed", 1))
			case "structure":
				body = updateBody(strings.Replace(updateNewHTML, "</p><p", "</p><br><p", 1))
			case "read":
				p.readError = true
				want = 502
			case "checkpoint":
				c.failStage = "draft_update_pending"
				want = 503
			case "unknown-field":
				body = strings.TrimSuffix(body, "}") + `,"title":"forbidden"}`
			}
			r := updateRequest(h, "v2.update.synthetic-"+kind, body)
			if r.Code != want || p.updates.Load() != 0 || p.adds.Load() != 0 {
				t.Fatal(r.Code, r.Body.String())
			}
		})
	}
}
func TestContentUpdateUnknownNeverRetries(t *testing.T) {
	h, p, _, _ := updateFixture()
	p.updateError = providerFailure(true, nil, 502, false, "synthetic lost acknowledgement")
	for i := 0; i < 2; i++ {
		r := updateRequest(h, "v2.update.synthetic-unknown", updateBody(updateNewHTML))
		reply := syncReply(t, r)
		if r.Code != 502 || reply.Status != "needs_reconciliation" || reply.ProviderSuccess != nil || reply.Retryable {
			t.Fatal(r.Body.String())
		}
	}
	if p.updates.Load() != 1 {
		t.Fatal("unknown write retried")
	}
}
func TestContentUpdateReadbackMismatchRetainsConfirmedID(t *testing.T) {
	for _, meta := range []bool{false, true} {
		h, p, _, _ := updateFixture()
		p.mutateMeta = meta
		p.readbackFail = !meta
		r := updateRequest(h, "v2.update.synthetic-readback", updateBody(updateNewHTML))
		reply := syncReply(t, r)
		if reply.Status != "needs_reconciliation" || reply.MediaID != "SYNTHETIC_DRAFT_ID" || reply.ProviderSuccess == nil || !*reply.ProviderSuccess || !reply.PartialSuccess || p.updates.Load() != 1 {
			t.Fatal(r.Body.String())
		}
	}
}
func TestWeChatUpdateOnlyAndExplicitAcknowledgement(t *testing.T) {
	for _, response := range []string{`{"errcode":0}`, `{}`, `{"errcode":40001}`} {
		t.Run(response, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				if r.URL.Path != "/cgi-bin/draft/update" {
					t.Error("wrong provider path")
				}
				var req struct {
					MediaID  string                     `json:"media_id"`
					Index    int                        `json:"index"`
					Articles map[string]json.RawMessage `json:"articles"`
				}
				if json.NewDecoder(r.Body).Decode(&req) != nil || req.MediaID != "SYNTHETIC_DRAFT_ID" || req.Index != 0 || string(req.Articles["title"]) != `"preserved"` {
					t.Error("invalid update schema")
				}
				w.Write([]byte(response))
			}))
			defer server.Close()
			p := NewWeChat("synthetic", "secret")
			p.BaseURL = server.URL
			_, err := p.UpdateDraftContent(context.Background(), "token", "SYNTHETIC_DRAFT_ID", 0, map[string]json.RawMessage{"title": json.RawMessage(`"preserved"`)})
			if (err == nil) != (response == `{"errcode":0}`) || calls != 1 {
				t.Fatal("update acknowledgement/retry invariant")
			}
		})
	}
}

// Optional local artifacts from the formatting owner: no provider calls, no draft writes.
func TestPreparedLayoutRequests(t *testing.T) {
 dir:=os.Getenv("MP_LAYOUT_FIXTURE_DIR");if dir=="" {t.Skip("Formatting owner artifacts are optional")}
 for _,id:=range []string{"01","02"} {t.Run(id,func(t *testing.T){
 raw,err:=os.ReadFile(filepath.Join(dir,"evidence",id+"-before-get.json"));if err!=nil{t.Fatal(err)}
 var saved struct { Response struct { NewsItem []map[string]json.RawMessage `json:"news_item"` } `json:"response"` };if json.Unmarshal(raw,&saved)!=nil||len(saved.Response.NewsItem)!=1{t.Fatal("Invalid local draft snapshot")}
 candidate,err:=os.ReadFile(filepath.Join(dir,"updates",id+"-content-only.json"));if err!=nil{t.Fatal(err)}
 h,p,_,_:=updateFixture();p.article=saved.Response.NewsItem[0]
 response:=updateRequest(h,"v2.layout.fixture-"+id,string(candidate));if response.Code!=200||p.updates.Load()!=1||p.adds.Load()!=0{t.Fatal(response.Code,response.Body.String())}
 }) }
}
