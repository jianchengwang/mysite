package app

import (
	"context"
	"errors"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// Optional disposable Redis fixture, never the configured production endpoint.
func TestRedisDraftCacheIsolated(t *testing.T) {
	addr := os.Getenv("MYSITE_ISOLATED_REDIS_TEST_ADDR")
	if addr == "" {
		t.Skip("disposable Redis fixture not configured")
	}
	if !strings.HasPrefix(addr, "127.0.0.1:") || addr == "127.0.0.1:6379" {
		t.Fatal("requires a disposable nonstandard loopback port")
	}
	cache, err := NewRedisDraftCache("redis://" + addr + "/15")
	if err != nil {
		t.Fatal(err)
	}
	defer cache.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if cache.Ping(ctx) != nil {
		t.Fatal("fixture unavailable")
	}
	key := draftCacheKey("synthetic-redis-fixture", newID())
	defer cache.client.Del(ctx, key)
	record := DraftCacheRecord{Owner: newID(), RequestHash: "synthetic-hash", Deadline: time.Now().Add(time.Minute), Reply: SyncDraftReply{APIVersion: 2, Mode: "synchronous", RequestID: newID(), Status: "processing", Stage: "preparing", HTTPStatus: 409, ExpiresAt: time.Now().Add(time.Hour)}}
	var owned atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, fresh, e := cache.Reserve(ctx, key, record, time.Hour)
			if e != nil {
				t.Error(e)
			}
			if fresh {
				owned.Add(1)
			}
		}()
	}
	wg.Wait()
	if owned.Load() != 1 {
		t.Fatalf("owners: %d", owned.Load())
	}
	changed := record
	changed.RequestHash = "different-hash"
	if _, _, err = cache.Reserve(ctx, key, changed, time.Hour); !errors.Is(err, ErrConflict) {
		t.Fatal("missing hash conflict", err)
	}
	wrongOwner := record
	wrongOwner.Owner = "different-owner"
	if cache.Update(ctx, key, wrongOwner) == nil {
		t.Fatal("owner fencing bypassed")
	}
	before, err := cache.client.PTTL(ctx, key).Result()
	if err != nil {
		t.Fatal(err)
	}
	record.Reply.Stage = "draft_add_pending"
	if cache.Update(ctx, key, record) != nil {
		t.Fatal("progress failed")
	}
	after, err := cache.client.PTTL(ctx, key).Result()
	if err != nil || after > before || after < 59*time.Minute {
		t.Fatal("TTL reset or removed", before, after, err)
	}
	record.Reply.Status = "succeeded"
	record.Reply.Stage = "draft_add_confirmed"
	record.Reply.MediaID = "SYNTHETIC_DRAFT_ID"
	record.Reply.ProviderSuccess = boolPointer(true)
	record.Reply.HTTPStatus = 200
	if cache.Update(ctx, key, record) != nil {
		t.Fatal("terminal receipt failed")
	}
	if cache.Update(ctx, key, record) == nil {
		t.Fatal("terminal record overwritten")
	}
	result, err := cache.Get(ctx, key)
	if err != nil || result.Reply.MediaID != record.Reply.MediaID {
		t.Fatal(err)
	}
	missing := key + ":missing"
	if cache.Update(ctx, missing, record) == nil {
		t.Fatal("expired/missing key recreated")
	}
	if _, err = cache.Get(ctx, missing); !errors.Is(err, ErrNotFound) {
		t.Fatal(err)
	}
	if value, _ := cache.client.Get(ctx, key).Result(); strings.Contains(value, "content") || strings.Contains(value, "secret") || strings.Contains(value, "token") {
		t.Fatal("body or credential in receipt")
	}
}
