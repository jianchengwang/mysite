package app

import (
	"context"
	"database/sql"
	"errors"
	"regexp"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

const claimIDSQL = "SELECT id FROM mysite_tasks WHERE destination_account_id=? AND status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED"
const claimRowSQL = "SELECT " + taskColumns + " FROM mysite_tasks WHERE destination_account_id=? AND id=?"

func TestSQLClaimEmptyQueueRollsBack(t *testing.T) {
	s, m := mockStore(t)
	m.ExpectBegin()
	m.ExpectQuery(regexp.QuoteMeta(claimIDSQL)).WithArgs("synthetic-app").WillReturnRows(sqlmock.NewRows([]string{"id"}))
	m.ExpectRollback()
	task, e := s.Claim(context.Background())
	if task != nil || e != nil {
		t.Fatalf("empty claim = %v, %v", task, e)
	}
	if e = m.ExpectationsWereMet(); e != nil {
		t.Fatal(e)
	}
}

func TestSQLClaimFailuresDoNotReturnTask(t *testing.T) {
	for _, stage := range []string{"begin", "select-id", "read-row", "update", "commit"} {
		t.Run(stage, func(t *testing.T) {
			s, m := mockStore(t)
			failure := errors.New("synthetic failure")
			id := strings.Repeat("a", 32)
			if stage == "begin" {
				m.ExpectBegin().WillReturnError(failure)
			} else {
				m.ExpectBegin()
				selected := m.ExpectQuery(regexp.QuoteMeta(claimIDSQL)).WithArgs("synthetic-app")
				if stage == "select-id" {
					selected.WillReturnError(failure)
				} else {
					selected.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(id))
					row := m.ExpectQuery(regexp.QuoteMeta(claimRowSQL)).WithArgs("synthetic-app", id)
					if stage == "read-row" {
						row.WillReturnError(failure)
					} else {
						row.WillReturnRows(taskRows())
						update := m.ExpectExec("UPDATE mysite_tasks.*lease_expires_at=.*").WithArgs(id)
						if stage == "update" {
							update.WillReturnError(failure)
						} else {
							update.WillReturnResult(sqlmock.NewResult(0, 1))
							m.ExpectCommit().WillReturnError(failure)
						}
					}
				}
				if stage != "commit" {
					m.ExpectRollback()
				}
			}
			task, e := s.Claim(context.Background())
			if task != nil || !errors.Is(e, failure) {
				t.Fatalf("failed claim returned task or changed error: %v %v", task, e)
			}
			if e = m.ExpectationsWereMet(); e != nil {
				t.Fatal(e)
			}
		})
	}
}

func TestSQLClaimSelectedRowMissingRollsBack(t *testing.T) {
	s, m := mockStore(t)
	id := strings.Repeat("a", 32)
	m.ExpectBegin()
	m.ExpectQuery(regexp.QuoteMeta(claimIDSQL)).WithArgs("synthetic-app").WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(id))
	m.ExpectQuery(regexp.QuoteMeta(claimRowSQL)).WithArgs("synthetic-app", id).WillReturnError(sql.ErrNoRows)
	m.ExpectRollback()
	task, e := s.Claim(context.Background())
	if task != nil || !errors.Is(e, ErrNotFound) {
		t.Fatal(task, e)
	}
	if e = m.ExpectationsWereMet(); e != nil {
		t.Fatal(e)
	}
}
