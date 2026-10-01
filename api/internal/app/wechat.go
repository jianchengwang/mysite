package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// A write error with an unknown outcome MUST NOT be automatically retried.
type RemoteError struct {
	Unknown bool
	Message string
}

func (e *RemoteError) Error() string { return e.Message }

type WeChat struct {
	Client                    *http.Client
	BaseURL, AppID, AppSecret string
	mu                        sync.Mutex
	token                     string
	expires                   time.Time
}

func NewWeChat(id, secret string) *WeChat {
	return &WeChat{Client: &http.Client{Timeout: 25 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return errors.New("WeChat redirects disabled") }}, BaseURL: "https://api.weixin.qq.com", AppID: id, AppSecret: secret}
}
func (w *WeChat) Token(ctx context.Context) (string, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.token != "" && time.Now().Before(w.expires) {
		return w.token, nil
	}
	body, _ := json.Marshal(map[string]any{"grant_type": "client_credential", "appid": w.AppID, "secret": w.AppSecret, "force_refresh": false})
	request, _ := http.NewRequestWithContext(ctx, http.MethodPost, w.BaseURL+"/cgi-bin/stable_token", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response, e := w.Client.Do(request)
	if e != nil {
		return "", errors.New("WeChat server token request failed")
	}
	defer response.Body.Close()
	data, e := io.ReadAll(io.LimitReader(response.Body, 65537))
	if e != nil || len(data) > 65536 || response.StatusCode != 200 {
		return "", errors.New("WeChat server token response failed")
	}
	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		ErrCode     int    `json:"errcode"`
	}
	if json.Unmarshal(data, &result) != nil || result.ErrCode != 0 || result.AccessToken == "" || result.ExpiresIn < 120 {
		return "", errors.New("WeChat server token unavailable; check server credentials and IP allowlist")
	}
	w.token = result.AccessToken
	w.expires = time.Now().Add(time.Duration(result.ExpiresIn-120) * time.Second)
	return w.token, nil
}
func (w *WeChat) call(ctx context.Context, path, token, contentType string, body []byte) (map[string]any, error) {
	separator := "?"
	if strings.Contains(path, "?") {
		separator = "&"
	}
	request, e := http.NewRequestWithContext(ctx, http.MethodPost, w.BaseURL+path+separator+"access_token="+url.QueryEscape(token), bytes.NewReader(body))
	if e != nil {
		return nil, &RemoteError{false, "invalid WeChat request"}
	}
	request.Header.Set("Content-Type", contentType)
	// No automatic retry, even for expired tokens: a write's outcome may be unknown.
	response, e := w.Client.Do(request)
	if e != nil {
		return nil, &RemoteError{true, "WeChat write outcome unknown; inspect remote state before submitting again"}
	}
	defer response.Body.Close()
	data, e := io.ReadAll(io.LimitReader(response.Body, 1<<20+1))
	if e != nil || len(data) > 1<<20 {
		return nil, &RemoteError{true, "WeChat response incomplete; remote outcome requires reconciliation"}
	}
	var result map[string]any
	if json.Unmarshal(data, &result) != nil {
		return nil, &RemoteError{true, "WeChat response invalid; remote outcome requires reconciliation"}
	}
	if code, ok := result["errcode"].(float64); ok && code != 0 {
		return nil, &RemoteError{false, fmt.Sprintf("WeChat rejected operation (code %.0f); no automatic retry", code)}
	}
	if response.StatusCode != 200 {
		return nil, &RemoteError{true, "WeChat HTTP failure; remote outcome requires reconciliation"}
	}
	return result, nil
}
func (w *WeChat) Upload(ctx context.Context, token string, image ImageData, cover bool) (string, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, e := writer.CreateFormFile("media", image.Filename)
	if e != nil {
		return "", e
	}
	_, _ = part.Write(image.Data)
	_ = writer.Close()
	path, field := "/cgi-bin/media/uploadimg", "url"
	if cover {
		path = "/cgi-bin/material/add_material"
		field = "media_id"
	}
	// add_material's image type is a permanent image used as thumb_media_id.
	if cover {
		path += "?type=image"
	}
	// call adds its own access_token separator.
	result, e := w.call(ctx, path, token, writer.FormDataContentType(), body.Bytes())
	if e != nil {
		return "", e
	}
	value, _ := result[field].(string)
	if value == "" {
		return "", &RemoteError{true, "WeChat upload identifier missing; inspect remote state"}
	}
	return value, nil
}
func (w *WeChat) AddDraft(ctx context.Context, token string, request DraftRequest, content, coverID string) (string, error) {
	article := map[string]any{"title": request.Title, "author": request.Author, "digest": request.Digest, "content": content, "content_source_url": request.SourceURL, "thumb_media_id": coverID, "show_cover_pic": request.ShowCoverPic, "need_open_comment": request.NeedOpenComment, "only_fans_can_comment": request.OnlyFansComment}
	body, _ := json.Marshal(map[string]any{"articles": []any{article}})
	result, e := w.call(ctx, "/cgi-bin/draft/add", token, "application/json", body)
	if e != nil {
		return "", e
	}
	id, _ := result["media_id"].(string)
	if id == "" {
		return "", &RemoteError{true, "WeChat draft identifier missing; inspect remote drafts before retrying"}
	}
	return id, nil
}
