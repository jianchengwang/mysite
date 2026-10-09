package app

import (
	"context"
	"net/http"
)

type DraftQueueDiagnostics struct {
	CurrentAccountOnly bool             `json:"current_account_only"`
	PersistedTaskCount int64            `json:"persisted_creation_task_count"`
	Counts             map[string]int64 `json:"counts_by_status"`
	RecentTasks        []map[string]any `json:"recent_tasks"`
}

type DraftDiagnosticsStore interface {
	DraftDiagnostics(context.Context) (DraftQueueDiagnostics, error)
}

// Read-only and account scoped. No request bodies, credentials or remote calls.
func (s *MySQLStore) DraftDiagnostics(ctx context.Context) (DraftQueueDiagnostics, error) {
	result := DraftQueueDiagnostics{CurrentAccountOnly: true, Counts: map[string]int64{}, RecentTasks: []map[string]any{}}
	rows, e := s.DB.QueryContext(ctx, `SELECT status,COUNT(*) FROM mysite_tasks WHERE destination_account_id=? GROUP BY status`, s.AccountID)
	if e != nil {
		return result, e
	}
	for rows.Next() {
		var status string
		var count int64
		if e = rows.Scan(&status, &count); e != nil {
			rows.Close()
			return result, e
		}
		result.Counts[status] = count
		result.PersistedTaskCount += count
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return result, e
	}
	tasks, e := s.DB.QueryContext(ctx, `SELECT id,status,stage,result,created_at,updated_at FROM mysite_tasks WHERE destination_account_id=? ORDER BY created_at DESC,id DESC LIMIT 20`, s.AccountID)
	if e != nil {
		return result, e
	}
	defer tasks.Close()
	for tasks.Next() {
		var task Task
		var data []byte
		if e = tasks.Scan(&task.ID, &task.Status, &task.Stage, &data, &task.CreatedAt, &task.UpdatedAt); e != nil {
			return result, e
		}
		task.Result = data
		view := draftResponse(task)
		result.RecentTasks = append(result.RecentTasks, map[string]any{"task_id": view.TaskID, "status": view.Status, "stage": view.Stage, "accepted": true, "provider_success": view.ProviderSuccess, "provider_errcode": view.ProviderErrcode, "provider_http_status": view.ProviderHTTPStatus, "redacted_message": view.RedactedMessage, "retryable": view.Retryable, "attempt": view.Attempt, "time": view.Time})
	}
	return result, tasks.Err()
}

func (s *Server) draftDiagnostics(w http.ResponseWriter, r *http.Request) {
	store, ok := s.Store.(DraftDiagnosticsStore)
	if !ok {
		problem(w, 503, "draft diagnostics store unavailable")
		return
	}
	result, e := store.DraftDiagnostics(r.Context())
	if e != nil {
		problem(w, 503, "draft diagnostics unavailable")
		return
	}
	jsonResponse(w, 200, result)
}
