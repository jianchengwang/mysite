package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"
)

var ErrDraftCacheUnavailable = errors.New("draft receipt cache unavailable")

// This DTO is the ONLY value allowed in Redis. Never embed Task/TaskResult or DraftRequest.
type SyncDraftReply struct {
	APIVersion          int           `json:"api_version"`
	Mode                string        `json:"mode"`
	RequestID           string        `json:"request_id"`
	Status              string        `json:"status"`
	Stage               string        `json:"stage"`
	ProviderSuccess     *bool         `json:"provider_success"`
	ProviderErrcode     *int          `json:"provider_errcode"`
	ProviderHTTPStatus  int           `json:"provider_http_status"`
	MediaID             string        `json:"media_id,omitempty"`
	ArticleCount        int           `json:"article_count"`
	RemoteWritePossible bool          `json:"remote_write_possible"`
	PartialSuccess      bool          `json:"partial_success"`
	Receipts            []SyncReceipt `json:"receipts"`
	Retryable           bool          `json:"retryable"`
	RedactedMessage     string        `json:"redacted_message"`
	CacheWarning        bool          `json:"cache_warning,omitempty"`
	HTTPStatus          int           `json:"http_status"`
	DurationMS          int64         `json:"duration_ms"`
	ExpiresAt           time.Time     `json:"idempotency_expires_at"`
}

type SyncReceipt struct {
	Stage              string `json:"stage"`
	ImageSHA256        string `json:"image_sha256,omitempty"`
	RemoteSHA256       string `json:"remote_sha256,omitempty"`
	MediaID            string `json:"media_id,omitempty"`
	ProviderErrcode    *int   `json:"provider_errcode"`
	ProviderHTTPStatus int    `json:"provider_http_status"`
}

type DraftCacheRecord struct {
	Owner       string         `json:"owner"`
	RequestHash string         `json:"request_hash"`
	Deadline    time.Time      `json:"deadline"`
	Reply       SyncDraftReply `json:"reply"`
}

type DraftCache interface {
	Reserve(context.Context, string, DraftCacheRecord, time.Duration) (DraftCacheRecord, bool, error)
	Update(context.Context, string, DraftCacheRecord) error
	Get(context.Context, string) (DraftCacheRecord, error)
	Ping(context.Context) error
}

func draftCacheKey(account, key string) string {
	h := sha256.Sum256([]byte(account + "\x00" + key))
	return "mysite:mp:draft:v2:" + hex.EncodeToString(h[:])
}

func boolPointer(value bool) *bool { return &value }

func cachedDraftReply(record DraftCacheRecord) SyncDraftReply {
	reply := record.Reply
	if reply.Status == "processing" && time.Now().After(record.Deadline) {
		reply.Status = "needs_reconciliation"
		reply.HTTPStatus = 409
		reply.RedactedMessage = "Operation interrupted or response lost; inspect remote state before any new submission"
		reply.PartialSuccess = len(reply.Receipts) > 0
		if reply.Stage == "draft_add_pending" || reply.Stage == "draft_update_pending" {
			reply.ProviderSuccess = nil
		}
	}
	return reply
}
