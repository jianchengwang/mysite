package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	mysql "github.com/go-sql-driver/mysql"
)

// This test accepts only the disposable isolated database; it never runs a worker.
func TestMySQLClaimIsolatedIntegration(t *testing.T) {
	dsn := os.Getenv("MYSITE_ISOLATED_CLAIM_TEST_DSN")
	if dsn == "" {
		t.Skip("disposable MySQL fixture not configured")
	}
	cfg, e := mysql.ParseDSN(dsn)
	if e != nil || cfg.DBName != "claim_sort_isolated" || cfg.Addr != "127.0.0.1:3306" {
		t.Fatal("requires isolated loopback fixture")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	s, e := OpenMySQL(dsn, "synthetic-claim-account")
	if e != nil {
		t.Fatal(e)
	}
	defer s.DB.Close()
	if e = s.Migrate(ctx); e != nil {
		t.Fatal(e)
	}
	reset := func() {
		t.Helper()
		if _, e = s.DB.ExecContext(ctx, "DELETE FROM mysite_tasks"); e != nil {
			t.Fatal(e)
		}
	}
	seed := func(n int, payload string) []string {
		t.Helper()
		ids := make([]string, n)
		for i := range ids {
			ids[i] = fmt.Sprintf("%032x", i+1)
			_, e = s.DB.ExecContext(ctx, `INSERT INTO mysite_tasks (id,destination_account_id,idempotency_key,request_hash,payload,created_at) VALUES (?,?,?,?,?,?)`, ids[i], s.AccountID, fmt.Sprintf("fixture-%d", i), strings.Repeat("a", 64), payload, time.Date(2026, 1, 1, 0, 0, i, 0, time.UTC))
			if e != nil {
				t.Fatal(e)
			}
		}
		return ids
	}
	t.Run("LargePayloadAccountScopeAndEmpty", func(t *testing.T) {
		reset()
		payload := `{"synthetic_cover":"` + strings.Repeat("x", 2*1024*1024) + `"}`
		ids := seed(2, payload)
		_, e = s.DB.ExecContext(ctx, `INSERT INTO mysite_tasks (id,destination_account_id,idempotency_key,request_hash,payload,created_at) VALUES (?,?,?,?,?,?)`, strings.Repeat("b", 32), "different-synthetic-account", "foreign", strings.Repeat("b", 64), `{}`, time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC))
		if e != nil {
			t.Fatal(e)
		}
		for _, id := range ids {
			before, e := s.Get(ctx, id)
			if e != nil {
				t.Fatal(e)
			}
			task, e := s.Claim(ctx)
			if e != nil || task == nil || task.ID != id || string(task.Payload) != string(before.Payload) || task.DestinationAccountID != s.AccountID || task.Status != "processing" {
				t.Fatalf("large payload claim failed: %v", e)
			}
		}
		task, e := s.Claim(ctx)
		if e != nil || task != nil {
			t.Fatalf("empty scoped queue: %v %v", task, e)
		}
	})
	t.Run("SkipsLockedOldestAndReleasesRollbackLock", func(t *testing.T) {
		reset()
		ids := seed(2, `{}`)
		tx, e := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
		if e != nil {
			t.Fatal(e)
		}
		defer tx.Rollback()
		var locked string
		if e = tx.QueryRowContext(ctx, claimIDSQL, s.AccountID).Scan(&locked); e != nil || locked != ids[0] {
			t.Fatal(locked, e)
		}
		task, e := s.Claim(ctx)
		if e != nil || task == nil || task.ID != ids[1] {
			t.Fatalf("did not skip locked first row: %v", e)
		}
		if e = tx.Rollback(); e != nil {
			t.Fatal(e)
		}
		task, e = s.Claim(ctx)
		if e != nil || task == nil || task.ID != ids[0] {
			t.Fatalf("rollback failed to release original row: %v", e)
		}
	})
	t.Run("ConcurrentWorkersNeverClaimSameTask", func(t *testing.T) {
		reset()
		seed(32, `{"synthetic":true}`)
		claimed := map[string]bool{}
		var mu sync.Mutex
		var wg sync.WaitGroup
		failures := make(chan error, 8)
		for i := 0; i < 8; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for {
					task, e := s.Claim(ctx)
					if e != nil {
						failures <- e
						return
					}
					if task == nil {
						return
					}
					mu.Lock()
					if claimed[task.ID] {
						mu.Unlock()
						failures <- errors.New("duplicate claim")
						return
					}
					claimed[task.ID] = true
					mu.Unlock()
				}
			}()
		}
		wg.Wait()
		close(failures)
		for e := range failures {
			t.Error(e)
		}
		if len(claimed) != 32 {
			t.Fatalf("claimed %d, want 32", len(claimed))
		}
		var count int
		if e = s.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM mysite_tasks WHERE status='processing'").Scan(&count); e != nil || count != 32 {
			t.Fatal(count, e)
		}
	})
	t.Run("UpdateFailureLeavesQueuedAndUnlocks", func(t *testing.T) {
		reset()
		ids := seed(1, `{}`)
		_, e = s.DB.ExecContext(ctx, `ALTER TABLE mysite_tasks ADD CONSTRAINT synthetic_claim_fail CHECK (status <> 'processing')`)
		if e != nil {
			t.Fatal(e)
		}
		defer s.DB.ExecContext(ctx, "ALTER TABLE mysite_tasks DROP CHECK synthetic_claim_fail")
		task, e := s.Claim(ctx)
		if e == nil || task != nil {
			t.Fatalf("update failure returned a claimed task")
		}
		stored, e := s.Get(ctx, ids[0])
		if e != nil || stored.Status != "queued" {
			t.Fatal(stored.Status, e)
		}
		tx, e := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
		if e != nil {
			t.Fatal(e)
		}
		defer tx.Rollback()
		var id string
		if e = tx.QueryRowContext(ctx, claimIDSQL, s.AccountID).Scan(&id); e != nil || id != ids[0] {
			t.Fatal(id, e)
		}
	})
	t.Run("ConcurrentIdempotentReserveReturnsOneTask", func(t *testing.T) {
		reset()
		var wg sync.WaitGroup
		ids := make(chan string, 8)
		fresh := make(chan bool, 8)
		failures := make(chan error, 8)
		for i := 0; i < 8; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				task, newTask, e := s.Reserve(ctx, "synthetic-idempotent-key", strings.Repeat("c", 64), json.RawMessage(`{"synthetic":true}`))
				if e != nil {
					failures <- e
					return
				}
				ids <- task.ID
				fresh <- newTask
			}()
		}
		wg.Wait()
		close(ids)
		close(fresh)
		close(failures)
		for e := range failures {
			t.Error(e)
		}
		unique := map[string]bool{}
		for id := range ids {
			unique[id] = true
		}
		created := 0
		for yes := range fresh {
			if yes {
				created++
			}
		}
		if len(unique) != 1 || created != 1 {
			t.Fatalf("unique=%d fresh=%d", len(unique), created)
		}
		_, _, e = s.Reserve(ctx, "synthetic-idempotent-key", strings.Repeat("d", 64), json.RawMessage(`{}`))
		if !errors.Is(e, ErrConflict) {
			t.Fatal(e)
		}
	})
}
