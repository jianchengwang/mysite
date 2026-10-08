package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestListContentWithdrawsOnlyTheThreeArchivedStories(t *testing.T) {
	store, mock := mockStore(t)
	rows := sqlmock.NewRows([]string{"path", "content_sha256", "imported_at"})
	for _, path := range []string{"store/changanluan.md", "store/mingyuelei.md", "store/wenroudao.md", "tech/intro-to-vue.md", "store/future.md", "tech/store/wenroudao.md"} {
		rows.AddRow(path, "sha", time.Now())
	}
	mock.ExpectQuery(regexp.QuoteMeta("SELECT path,content_sha256,imported_at FROM mysite_content ORDER BY path")).WillReturnRows(rows)
	got, err := store.ListContent(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	expected := []string{"tech/intro-to-vue.md", "store/future.md", "tech/store/wenroudao.md"}
	if len(got) != len(expected) {
		t.Fatalf("got %d retained rows, want %d", len(got), len(expected))
	}
	for i, path := range expected {
		if got[i].Path != path {
			t.Fatalf("got %q, want %q", got[i].Path, path)
		}
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestArchivedStoryReadsAreNotFoundWithoutDatabaseChanges(t *testing.T) {
	store, mock := mockStore(t)
	handler := (&Server{Config: Config{APIKey: testKey}, Store: newStore(), Content: store}).Handler()
	for _, path := range []string{"store/changanluan.md", "store/mingyuelei.md", "store/wenroudao.md"} {
		if _, err := store.GetContent(context.Background(), path); !errors.Is(err, sql.ErrNoRows) {
			t.Fatalf("%s: got %v", path, err)
		}
		for _, authenticated := range []bool{false, true} {
			req := httptest.NewRequest("GET", "/api/blog/content/"+path, nil)
			want := 401
			if authenticated {
				req.Header.Set("Authorization", "Bearer "+testKey)
				want = 404
			}
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, req)
			if response.Code != want {
				t.Fatalf("%s authenticated=%v: got %d, want %d", path, authenticated, response.Code, want)
			}
		}
	}
	// No SQL expectations: a retired read never queries or mutates persisted data.
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestRetainedContentStillReadableThroughAuthenticatedAPI(t *testing.T) {
	store, mock := mockStore(t)
	path := "tech/intro-to-vue.md"
	mock.ExpectQuery(regexp.QuoteMeta("SELECT path,content_sha256,body,imported_at FROM mysite_content WHERE path=?")).WithArgs(path).WillReturnRows(sqlmock.NewRows([]string{"path", "content_sha256", "body", "imported_at"}).AddRow(path, "sha", "retained body", time.Now()))
	handler := (&Server{Config: Config{APIKey: testKey}, Store: newStore(), Content: store}).Handler()
	req := httptest.NewRequest("GET", "/api/blog/content/"+path, nil)
	req.Header.Set("Authorization", "Bearer "+testKey)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, req)
	var got Content
	if response.Code != 200 {
		t.Fatalf("got HTTP %d", response.Code)
	}
	if err := json.Unmarshal(response.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got.Path != path || got.Body != "retained body" {
		t.Fatalf("retained content changed: %+v", got)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
