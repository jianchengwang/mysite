package app

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisDraftCache struct{ client *redis.Client }

func NewRedisDraftCache(rawURL string) (*RedisDraftCache, error) {
	options, err := redis.ParseURL(rawURL)
	if err != nil {
		return nil, ErrDraftCacheUnavailable
	}
	options.Protocol = 2    // Supports the existing Redis 7 service.
	options.MaxRetries = -1 // Reservation errors are ambiguous; never retry them implicitly.
	options.DialTimeout = time.Second
	options.ReadTimeout = time.Second
	options.WriteTimeout = time.Second
	options.ContextTimeoutEnabled = true
	options.PoolSize = 4
	return &RedisDraftCache{client: redis.NewClient(options)}, nil
}

func (c *RedisDraftCache) Close() error { return c.client.Close() }
func (c *RedisDraftCache) Ping(ctx context.Context) error {
	if c.client.Ping(ctx).Err() != nil {
		return ErrDraftCacheUnavailable
	}
	return nil
}

func encodeDraftCache(record DraftCacheRecord) ([]byte, error) {
	data, err := json.Marshal(record)
	if err != nil || len(data) > 16384 || len(record.Reply.Receipts) > 10 {
		return nil, ErrDraftCacheUnavailable
	}
	return data, nil
}

func (c *RedisDraftCache) Reserve(ctx context.Context, key string, record DraftCacheRecord, ttl time.Duration) (DraftCacheRecord, bool, error) {
	data, err := encodeDraftCache(record)
	if err != nil {
		return DraftCacheRecord{}, false, err
	}
	created, err := c.client.SetNX(ctx, key, data, ttl).Result()
	if err != nil {
		return DraftCacheRecord{}, false, ErrDraftCacheUnavailable
	}
	if created {
		return record, true, nil
	}
	existing, err := c.Get(ctx, key)
	if err != nil {
		return DraftCacheRecord{}, false, err
	}
	if existing.RequestHash != record.RequestHash {
		return existing, false, ErrConflict
	}
	return existing, false, nil
}

// Never delete/re-acquire a pending record. Keep its original expiration on every transition.
const updateDraftCacheLua = `
local raw=redis.call('GET',KEYS[1])
if not raw then return 0 end
local old=cjson.decode(raw)
local new=cjson.decode(ARGV[1])
if old.owner~=new.owner or old.request_hash~=new.request_hash then return 0 end
if old.reply.status~='processing' then return 0 end
redis.call('SET',KEYS[1],ARGV[1],'XX','KEEPTTL')
return 1`

func (c *RedisDraftCache) Update(ctx context.Context, key string, record DraftCacheRecord) error {
	data, err := encodeDraftCache(record)
	if err != nil {
		return err
	}
	value, err := c.client.Eval(ctx, updateDraftCacheLua, []string{key}, data).Int()
	if err != nil || value != 1 {
		return ErrDraftCacheUnavailable
	}
	return nil
}

func (c *RedisDraftCache) Get(ctx context.Context, key string) (DraftCacheRecord, error) {
	data, err := c.client.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		return DraftCacheRecord{}, ErrNotFound
	}
	if err != nil || len(data) > 16384 {
		return DraftCacheRecord{}, ErrDraftCacheUnavailable
	}
	var record DraftCacheRecord
	if json.Unmarshal(data, &record) != nil || record.Owner == "" || record.RequestHash == "" || record.Reply.APIVersion != 2 || record.Reply.RequestID == "" || record.Deadline.IsZero() || record.Reply.ExpiresAt.IsZero() {
		return DraftCacheRecord{}, ErrDraftCacheUnavailable
	}
	return record, nil
}
