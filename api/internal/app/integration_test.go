//go:build integration

package app

import (
	"context"
	"encoding/json"
	mysql "github.com/go-sql-driver/mysql"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

// Never enabled by the ordinary test command. Requires a dedicated *_test DB.
func TestMySQLIntegration(t *testing.T) {
	dsn := os.Getenv("MYSQL_TEST_DSN")
	if dsn == "" {
		t.Skip("set MYSQL_TEST_DSN to a dedicated *_test database")
	}
	cfg, e := mysql.ParseDSN(dsn)
	if e != nil || !strings.HasSuffix(cfg.DBName, "_test") {
		t.Fatal("integration tests require a dedicated database whose name ends _test")
	}
	account := "test-" + newID()
	s, e := OpenMySQL(dsn, account)
	if e != nil {
		t.Fatal(e)
	}
	defer s.DB.Close()
	ctx, c := context.WithTimeout(context.Background(), 30*time.Second)
	defer c()
	if e = s.Migrate(ctx); e != nil {
		t.Fatal(e)
	}
	if e = s.Migrate(ctx); e != nil {
		t.Fatal(e)
	}
	defer s.DB.ExecContext(context.Background(), "DELETE FROM mysite_tasks WHERE destination_account_id=?", account)
	var wg sync.WaitGroup
	ids := make(chan string, 10)
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			task, _, err := s.Reserve(ctx, "synthetic-integration", "hash", json.RawMessage(`{"synthetic":true}`))
			if err != nil {
				t.Error(err)
				return
			}
			ids <- task.ID
		}()
	}
	wg.Wait()
	close(ids)
	one := ""
	for id := range ids {
		if one == "" {
			one = id
		}
		if one != id {
			t.Fatal("duplicate task")
		}
	}
	task, e := s.Claim(ctx)
	if e != nil || task == nil {
		t.Fatal(e)
	}
	if task.DestinationAccountID != account {
		t.Fatal("wrong account")
	}
	if e = s.Finish(ctx, task.ID, "needs_reconciliation", json.RawMessage(`{}`), "synthetic outcome"); e != nil {
		t.Fatal(e)
	}
	if next, e := s.Claim(ctx); e != nil || next != nil {
		t.Fatal("unknown task retried", e)
	}
}
