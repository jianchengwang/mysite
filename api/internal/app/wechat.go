package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
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
		return "", providerFailure(false, nil, 0, true, "WeChat token request failed; no remote write was attempted")
	}
	defer response.Body.Close()
	data, e := io.ReadAll(io.LimitReader(response.Body, 65537))
	if e != nil || len(data) > 65536 {
		return "", providerFailure(false, nil, response.StatusCode, true, "WeChat token response incomplete; no remote write was attempted")
	}
	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		ErrCode     *int   `json:"errcode"`
	}
	decodeError := json.Unmarshal(data, &result)
	if decodeError != nil {
		result.ErrCode = nil
	}
	if response.StatusCode != http.StatusOK {
		return "", providerFailure(false, result.ErrCode, response.StatusCode, response.StatusCode >= 500 || response.StatusCode == 429, "WeChat token HTTP failure; no remote write was attempted")
	}
	if decodeError != nil {
		return "", providerFailure(false, nil, response.StatusCode, false, "WeChat token response invalid; no remote write was attempted")
	}
	if result.ErrCode != nil && *result.ErrCode != 0 {
		return "", providerFailure(false, result.ErrCode, response.StatusCode, false, providerMessage(*result.ErrCode))
	}
	if result.AccessToken == "" || result.ExpiresIn < 120 {
		return "", providerFailure(false, result.ErrCode, response.StatusCode, false, "WeChat token receipt missing or invalid; no remote write was attempted")
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
		return nil, providerFailure(false, nil, 0, false, "Invalid WeChat write request")
	}
	request.Header.Set("Content-Type", contentType)
	// No automatic retry, even for expired tokens: a write's outcome may be unknown.
	response, e := w.Client.Do(request)
	if e != nil {
		return nil, providerFailure(true, nil, 0, false, "WeChat write outcome unknown; reconcile remote state before submitting again")
	}
	defer response.Body.Close()
	data, e := io.ReadAll(io.LimitReader(response.Body, 1<<20+1))
	if e != nil || len(data) > 1<<20 {
		return nil, providerFailure(true, nil, response.StatusCode, false, "WeChat response incomplete; remote outcome requires reconciliation")
	}
	var result map[string]any
	var envelope struct {
		ErrCode *int `json:"errcode"`
	}
	decodeError := json.Unmarshal(data, &result)
	codeError := json.Unmarshal(data, &envelope)
	if codeError != nil {
		envelope.ErrCode = nil
	}
	if response.StatusCode >= 500 {
		return nil, providerFailure(true, envelope.ErrCode, response.StatusCode, false, "WeChat write HTTP failure; remote outcome requires reconciliation")
	}
	if decodeError != nil || codeError != nil || result == nil {
		return nil, providerFailure(true, nil, response.StatusCode, false, "WeChat write response invalid; remote outcome requires reconciliation")
	}
	if envelope.ErrCode != nil && *envelope.ErrCode != 0 {
		if *envelope.ErrCode == 40001 || *envelope.ErrCode == 40014 || *envelope.ErrCode == 42001 {
			w.mu.Lock()
			w.token = ""
			w.expires = time.Time{}
			w.mu.Unlock()
		}
		return nil, providerFailure(false, envelope.ErrCode, response.StatusCode, false, providerMessage(*envelope.ErrCode))
	}
	if response.StatusCode != http.StatusOK {
		return nil, providerFailure(true, envelope.ErrCode, response.StatusCode, false, "WeChat write HTTP failure; remote outcome requires reconciliation")
	}
	return result, nil
}

// ProviderReceipt reports only metadata actually present in the successful reply.
type ProviderReceipt struct {
	Errcode    *int
	HTTPStatus int
}

func successfulProviderReceipt(result map[string]any) ProviderReceipt {
	receipt := ProviderReceipt{HTTPStatus: http.StatusOK}
	if value, ok := result["errcode"].(float64); ok {
		code := int(value)
		receipt.Errcode = &code
	}
	return receipt
}
func (w *WeChat) Upload(ctx context.Context, token string, image ImageData, cover bool) (string, error) {
	id, _, err := w.UploadWithReceipt(ctx, token, image, cover)
	return id, err
}
func (w *WeChat) AddDraft(ctx context.Context, token string, request DraftRequest, content, coverID string) (string, error) {
	id, _, err := w.AddDraftWithReceipt(ctx, token, request, content, coverID)
	return id, err
}
func (w *WeChat) UploadWithReceipt(ctx context.Context, token string, image ImageData, cover bool) (string, ProviderReceipt, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, e := writer.CreateFormFile("media", image.Filename)
	if e != nil {
		return "", ProviderReceipt{}, e
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
		return "", ProviderReceipt{}, e
	}
	value, _ := result[field].(string)
	if value == "" || (cover && !validMediaID(value)) {
		return "", ProviderReceipt{}, providerFailure(true, nil, http.StatusOK, false, "WeChat upload identifier missing or invalid; reconcile remote state")
	}
	return value, successfulProviderReceipt(result), nil
}
func (w *WeChat) AddDraftWithReceipt(ctx context.Context, token string, request DraftRequest, content, coverID string) (string, ProviderReceipt, error) {
	article := map[string]any{"title": request.Title, "author": request.Author, "digest": request.Digest, "content": content, "content_source_url": request.SourceURL, "thumb_media_id": coverID, "show_cover_pic": request.ShowCoverPic, "need_open_comment": request.NeedOpenComment, "only_fans_can_comment": request.OnlyFansComment}
	body, _ := json.Marshal(map[string]any{"articles": []any{article}})
	result, e := w.call(ctx, "/cgi-bin/draft/add", token, "application/json", body)
	if e != nil {
		return "", ProviderReceipt{}, e
	}
	id, _ := result["media_id"].(string)
	if !validMediaID(id) {
		return "", ProviderReceipt{}, providerFailure(true, nil, http.StatusOK, false, "WeChat draft identifier missing or invalid; reconcile remote drafts before retrying")
	}
	return id, successfulProviderReceipt(result), nil
}
