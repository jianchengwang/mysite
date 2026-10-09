package app

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"time"
)

// ProviderError deliberately excludes raw errmsg, tokens, URLs and response bodies.
type ProviderError struct {
	*RemoteError
	ProviderErrcode *int
	HTTPStatus      int
	Retryable       bool
}

func (e *ProviderError) Unwrap() error { return e.RemoteError }

func providerFailure(unknown bool, code *int, status int, retryable bool, message string) error {
	return &ProviderError{RemoteError: &RemoteError{Unknown: unknown, Message: message}, ProviderErrcode: code, HTTPStatus: status, Retryable: retryable}
}

func providerMessage(code int) string {
	switch code {
	case 40164:
		return "WeChat rejected the server IP allowlist; verify the current egress IP"
	case 40001, 40014, 42001:
		return "WeChat rejected an invalid or expired token; no automatic write retry"
	case 40013:
		return "WeChat rejected the configured account identifier"
	case 40125:
		return "WeChat rejected the configured account credentials"
	case 48001:
		return "WeChat rejected an unavailable account capability"
	case 45009:
		return "WeChat rejected an account rate limit"
	default:
		return "WeChat explicitly rejected the operation; inspect the provider error code"
	}
}

var mediaIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,512}$`)

func validMediaID(id string) bool { return mediaIDPattern.MatchString(id) }

type DraftDiagnostic struct {
	TaskID             string    `json:"task_id"`
	Stage              string    `json:"stage"`
	Status             string    `json:"status"`
	ProviderErrcode    *int      `json:"provider_errcode"`
	ProviderHTTPStatus int       `json:"provider_http_status"`
	RedactedMessage    string    `json:"redacted_message"`
	Retryable          bool      `json:"retryable"`
	Attempt            int       `json:"attempt"`
	Time               time.Time `json:"time"`
}

func logDraft(logger *slog.Logger, diagnostic DraftDiagnostic) {
	if logger == nil {
		logger = slog.Default()
	}
	var code any
	if diagnostic.ProviderErrcode != nil {
		code = *diagnostic.ProviderErrcode
	}
	logger.Info("mp_draft_task", "task_id", diagnostic.TaskID, "stage", diagnostic.Stage,
		"status", diagnostic.Status, "provider_errcode", code, "provider_http_status", diagnostic.ProviderHTTPStatus,
		"redacted_message", diagnostic.RedactedMessage, "retryable", diagnostic.Retryable,
		"attempt", diagnostic.Attempt, "event_time", diagnostic.Time)
}

type draftTaskResponse struct {
	Task
	TaskID             string    `json:"task_id"`
	Stage              string    `json:"stage"`
	Accepted           bool      `json:"accepted"`
	ProviderSuccess    bool      `json:"provider_success"`
	Terminal           bool      `json:"terminal"`
	PollURL            string    `json:"poll_url"`
	ProviderErrcode    *int      `json:"provider_errcode"`
	ProviderHTTPStatus int       `json:"provider_http_status"`
	RedactedMessage    string    `json:"redacted_message"`
	Retryable          bool      `json:"retryable"`
	Attempt            int       `json:"attempt"`
	Time               time.Time `json:"time"`
}

func draftResponse(t Task) draftTaskResponse {
	var result TaskResult
	_ = json.Unmarshal(t.Result, &result)
	d := result.Diagnostic
	if d == nil {
		stage := t.Stage
		if stage == "" {
			stage = t.Status
		}
		d = &DraftDiagnostic{TaskID: t.ID, Stage: stage, Status: t.Status, Time: t.UpdatedAt}
		if d.Time.IsZero() {
			d.Time = t.CreatedAt
		}
		if d.Time.IsZero() {
			d.Time = time.Now().UTC()
		}
		if t.Status == "queued" {
			d.RedactedMessage = "Accepted into the queue; no WeChat draft has been confirmed"
		} else {
			// Older rows cannot reliably reconstruct the provider code or failed stage.
			d.RedactedMessage = "Legacy task record; inspect the stored status and reconcile the provider outcome"
		}
	}
	success := t.Status == "succeeded" && validMediaID(result.MediaID)
	terminal := t.Status == "succeeded" || t.Status == "failed" || t.Status == "needs_reconciliation"
	message := d.RedactedMessage
	if t.Status == "needs_reconciliation" && d.Status != t.Status {
		message = "Worker lease expired; reconcile remote state before submitting again"
	}
	if t.Status == "succeeded" && !success {
		message = "No valid media_id receipt; provider success is unconfirmed and requires reconciliation"
	}
	return draftTaskResponse{Task: t, TaskID: t.ID, Stage: d.Stage, Accepted: true, ProviderSuccess: success,
		Terminal: terminal, PollURL: "/api/tasks/" + t.ID, ProviderErrcode: d.ProviderErrcode,
		ProviderHTTPStatus: d.ProviderHTTPStatus, RedactedMessage: message,
		Retryable: t.Status == "failed" && d.Retryable, Attempt: d.Attempt, Time: d.Time}
}

func draftProblem(w http.ResponseWriter, status int, message string) {
	d := DraftDiagnostic{Stage: "request_validation", Status: "not_accepted", RedactedMessage: message, Time: time.Now().UTC()}
	if status == http.StatusServiceUnavailable {
		d.Stage = "queue"
		d.Retryable = true
		if message == "WeChat is not configured on the server" {
			d.Stage = "configuration"
			d.Retryable = false
		}
	}
	if status == http.StatusConflict {
		d.Stage = "queue"
	}
	logDraft(nil, d)
	jsonResponse(w, status, map[string]any{"detail": message, "accepted": false, "provider_success": false,
		"task_id": nil, "stage": d.Stage, "status": d.Status, "provider_errcode": nil,
		"redacted_message": message, "retryable": d.Retryable, "attempt": 0, "time": d.Time})
}

func diagnosticError(e error) (message string, code *int, httpStatus int, retryable bool) {
	var provider *ProviderError
	if errors.As(e, &provider) {
		return provider.Message, provider.ProviderErrcode, provider.HTTPStatus, provider.Retryable
	}
	var remote *RemoteError
	if errors.As(e, &remote) {
		return remote.Message, nil, 0, false
	}
	// Local stages use fixed messages rather than propagating arbitrary errors.
	return "Draft preparation failed at this stage; no provider success was confirmed", nil, 0, false
}
