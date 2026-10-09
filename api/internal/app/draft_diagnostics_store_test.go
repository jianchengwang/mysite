package app

import (
	"context"
	"encoding/json"
	"github.com/DATA-DOG/go-sqlmock"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestDraftDiagnosticsDistinguishesNoCreationTaskFromFailure(t *testing.T) {
	for _, hasTask := range []bool{false, true} {
		t.Run(map[bool]string{false: "never_persisted", true: "attempt_failed"}[hasTask], func(t *testing.T) {
			db, m, e := sqlmock.New()
			if e != nil {
				t.Fatal(e)
			}
			defer db.Close()
			store := &MySQLStore{DB: db, AccountID: "synthetic-account"}
			counts := sqlmock.NewRows([]string{"status", "count"})
			if hasTask {
				counts.AddRow("failed", 1)
			}
			m.ExpectQuery("SELECT status,COUNT.*FROM mysite_tasks WHERE destination_account_id=\\? GROUP BY status").WithArgs("synthetic-account").WillReturnRows(counts)
			rows := sqlmock.NewRows([]string{"id", "status", "stage", "result", "created_at", "updated_at"})
			if hasTask {
				code := 40164
				result, _ := json.Marshal(TaskResult{Diagnostic: &DraftDiagnostic{TaskID: "synthetic-task", Status: "failed", Stage: "token", ProviderErrcode: &code, RedactedMessage: providerMessage(code), Attempt: 1, Time: time.Now().UTC()}})
				rows.AddRow("synthetic-task", "failed", "failed", result, time.Now(), time.Now())
			}
			m.ExpectQuery("SELECT id,status,stage,result,created_at,updated_at FROM mysite_tasks WHERE destination_account_id=\\? ORDER BY created_at DESC,id DESC LIMIT 20").WithArgs("synthetic-account").WillReturnRows(rows)
			result, e := store.DraftDiagnostics(context.Background())
			if e != nil {
				t.Fatal(e)
			}
			if !result.CurrentAccountOnly || result.PersistedTaskCount != int64(len(result.RecentTasks)) {
				t.Fatal(result)
			}
			if hasTask {
				if result.RecentTasks[0]["stage"] != "token" || result.RecentTasks[0]["provider_success"] != false || result.Counts["failed"] != 1 {
					t.Fatal(result)
				}
			} else {
				if result.PersistedTaskCount != 0 || len(result.RecentTasks) != 0 {
					t.Fatal("invented queued task")
				}
			}
			if e = m.ExpectationsWereMet(); e != nil {
				t.Fatal(e)
			}
		})
	}
}

func TestDraftDiagnosticsRequiresAuthentication(t *testing.T) {
	h := (&Server{Config: Config{APIKey: testKey}, Store: newStore()}).Handler()
	out := httptest.NewRecorder()
	h.ServeHTTP(out, httptest.NewRequest("GET", "/api/mp/draft/diagnostics", nil))
	if out.Code != http.StatusUnauthorized {
		t.Fatal(out.Code)
	}
}
