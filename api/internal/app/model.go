package app

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"
)

var ErrConflict = errors.New("idempotency key already belongs to another request")
var ErrNotFound = errors.New("task not found")

type DraftRequest struct {
	Title           string `json:"title"`
	Author          string `json:"author"`
	Digest          string `json:"digest"`
	Content         string `json:"content"`
	SourceURL       string `json:"content_source_url"`
	CoverData       string `json:"cover_image_data_url,omitempty"`
	CoverURL        string `json:"cover_image_url,omitempty"`
	NeedOpenComment int    `json:"need_open_comment"`
	OnlyFansComment int    `json:"only_fans_can_comment"`
	ShowCoverPic    int    `json:"show_cover_pic"`
}

func (d DraftRequest) Validate() error {
	if strings.TrimSpace(d.Title) == "" || utf8.RuneCountInString(d.Title) > 64 || utf8.RuneCountInString(d.Author) > 64 || utf8.RuneCountInString(d.Digest) > 120 {
		return errors.New("title (1–64), author (≤64), and digest (≤120) character limits apply")
	}
	if strings.TrimSpace(d.Content) == "" || len(d.Content) > 4<<20 {
		return errors.New("content must contain 1 byte to 4 MiB")
	}
	if len(d.CoverData) > 4<<20 || len(d.CoverURL) > 2048 {
		return errors.New("cover input is too large")
	}
	if d.CoverData != "" && d.CoverURL != "" {
		return errors.New("supply one cover source")
	}
	if d.SourceURL != "" {
		u, e := url.Parse(d.SourceURL)
		if e != nil || u.Host == "" || (u.Scheme != "https" && u.Scheme != "http") || u.User != nil {
			return errors.New("content_source_url must be an HTTP(S) URL")
		}
	}
	for _, v := range []int{d.NeedOpenComment, d.OnlyFansComment, d.ShowCoverPic} {
		if v < 0 || v > 1 {
			return errors.New("comment and cover flags must be 0 or 1")
		}
	}
	return nil
}

type Task struct {
	DestinationAccountID string          `json:"destination_account_id"`
	ID                   string          `json:"id"`
	Status               string          `json:"status"`
	Stage                string          `json:"stage"`
	RequestHash          string          `json:"request_hash"`
	Result               json.RawMessage `json:"result,omitempty"`
	Error                string          `json:"error,omitempty"`
	CreatedAt            time.Time       `json:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at"`
	Payload              json.RawMessage `json:"-"`
}
type Store interface {
	Reserve(context.Context, string, string, json.RawMessage) (Task, bool, error)
	Get(context.Context, string) (Task, error)
	Claim(context.Context) (*Task, error)
	Checkpoint(context.Context, string, string, json.RawMessage) error
	Finish(context.Context, string, string, json.RawMessage, string) error
	ReconcileExpired(context.Context) error
	Ping(context.Context) error
}
