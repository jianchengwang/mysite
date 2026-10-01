package app

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	mysql "github.com/go-sql-driver/mysql"
	"regexp"
	"strings"
	"testing"
	"time"
)

func mockStore(t *testing.T) (*MySQLStore, sqlmock.Sqlmock) {
	t.Helper()
	db, m, e := sqlmock.New()
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = db.Close() })
	return &MySQLStore{DB: db, AccountID: "synthetic-app"}, m
}
func taskRows() *sqlmock.Rows {
	return sqlmock.NewRows(strings.Split(taskColumns, ",")).AddRow("synthetic-app", strings.Repeat("a", 32), "queued", "queued", "hash", []byte(`{"title":"t"}`), nil, "", time.Now(), time.Now())
}
func TestSQLReserveDuplicateAccountAndConflict(t *testing.T) {
	s, m := mockStore(t)
	m.ExpectExec("INSERT INTO mysite_tasks").WithArgs(sqlmock.AnyArg(), "synthetic-app", "synthetic-key", "different", []byte(`{}`)).WillReturnError(&mysql.MySQLError{Number: 1062})
	m.ExpectQuery("SELECT .* WHERE destination_account_id=\\? AND idempotency_key=\\?").WithArgs("synthetic-app", "synthetic-key").WillReturnRows(taskRows())
	_, _, e := s.Reserve(context.Background(), "synthetic-key", "different", json.RawMessage(`{}`))
	if !errors.Is(e, ErrConflict) {
		t.Fatal(e)
	}
	if e = m.ExpectationsWereMet(); e != nil {
		t.Fatal(e)
	}
}
func TestSQLClaimUsesAccountAndTransaction(t *testing.T) {
	s, m := mockStore(t)
	m.ExpectBegin()
	m.ExpectQuery("SELECT .*destination_account_id=\\?.*FOR UPDATE SKIP LOCKED").WithArgs("synthetic-app").WillReturnRows(taskRows())
	m.ExpectExec("UPDATE mysite_tasks.*lease_expires_at=.*").WithArgs(strings.Repeat("a", 32)).WillReturnResult(sqlmock.NewResult(0, 1))
	m.ExpectCommit()
	task, e := s.Claim(context.Background())
	if e != nil || task.Status != "processing" {
		t.Fatal(e)
	}
	if e = m.ExpectationsWereMet(); e != nil {
		t.Fatal(e)
	}
}
func TestSQLExpiredTaskCannotBeRequeued(t *testing.T) {
	s, m := mockStore(t)
	m.ExpectExec("UPDATE mysite_tasks SET status='needs_reconciliation'.*lease_expires_at < UTC_TIMESTAMP").WillReturnResult(sqlmock.NewResult(0, 1))
	if e := s.ReconcileExpired(context.Background()); e != nil {
		t.Fatal(e)
	}
	if e := m.ExpectationsWereMet(); e != nil {
		t.Fatal(e)
	}
}
func TestSQLMediaPurposeAndAccountScope(t *testing.T) {
	s, m := mockStore(t)
	m.ExpectExec("INSERT INTO mysite_media").WithArgs("synthetic-app", "sha", "cover", "task-id").WillReturnError(&mysql.MySQLError{Number: 1062})
	m.ExpectQuery("SELECT status,COALESCE.*destination_account_id=\\? AND image_sha256=\\? AND purpose=\\?").WithArgs("synthetic-app", "sha", "cover").WillReturnRows(sqlmock.NewRows([]string{"status", "remote"}).AddRow("ready", "confirmed-id"))
	remote, fresh, e := s.ReserveMedia(context.Background(), "sha", "cover", "task-id")
	if e != nil || fresh || remote != "confirmed-id" {
		t.Fatal(remote, fresh, e)
	}
	if e = m.ExpectationsWereMet(); e != nil {
		t.Fatal(e)
	}
}
func TestSQLMigrationIdempotentContract(t *testing.T) {
	s, m := mockStore(t)
	m.ExpectExec("CREATE TABLE IF NOT EXISTS mysite_schema_migrations").WillReturnResult(sqlmock.NewResult(0, 0))
	m.ExpectQuery("SELECT COUNT.*mysite_schema_migrations").WithArgs("001_initial.sql").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
	data, _ := migrations.ReadFile("migrations/001_initial.sql")
	for _, statement := range strings.Split(string(data), ";") {
		if strings.TrimSpace(statement) != "" {
			m.ExpectExec(regexp.QuoteMeta(statement)).WillReturnResult(sqlmock.NewResult(0, 0))
		}
	}
	m.ExpectExec("INSERT IGNORE INTO mysite_schema_migrations").WithArgs("001_initial.sql").WillReturnResult(sqlmock.NewResult(1, 1))
	if e := s.Migrate(context.Background()); e != nil {
		t.Fatal(e)
	}
	if e := m.ExpectationsWereMet(); e != nil {
		t.Fatal(e)
	}
}
