package app

import (
	"context"
	"errors"
	mysql "github.com/go-sql-driver/mysql"
)

type MediaStore interface {
	ReserveMedia(context.Context, string, string, string) (string, bool, error)
	ConfirmMedia(context.Context, string, string, string, string) error
	MarkMediaUnknown(context.Context, string, string, string) error
}

func (s *MySQLStore) ReserveMedia(ctx context.Context, hash, purpose, taskID string) (string, bool, error) {
	_, e := s.DB.ExecContext(ctx, `INSERT INTO mysite_media(destination_account_id,image_sha256,purpose,owner_task_id) VALUES(?,?,?,?)`, s.AccountID, hash, purpose, taskID)
	if e == nil {
		return "", true, nil
	}
	var me *mysql.MySQLError
	if !errors.As(e, &me) || me.Number != 1062 {
		return "", false, e
	}
	var status, remote string
	e = s.DB.QueryRowContext(ctx, `SELECT status,COALESCE(remote_id,'') FROM mysite_media WHERE destination_account_id=? AND image_sha256=? AND purpose=?`, s.AccountID, hash, purpose).Scan(&status, &remote)
	if e != nil {
		return "", false, e
	}
	if status == "ready" && remote != "" {
		return remote, false, nil
	}
	return "", false, &RemoteError{true, "Matching media upload is reserved or uncertain; reconcile its owner task before any upload retry"}
}
func (s *MySQLStore) ConfirmMedia(ctx context.Context, hash, purpose, taskID, remote string) error {
	result, e := s.DB.ExecContext(ctx, `UPDATE mysite_media SET status='ready',remote_id=? WHERE destination_account_id=? AND image_sha256=? AND purpose=? AND owner_task_id=? AND status='reserved'`, remote, s.AccountID, hash, purpose, taskID)
	if e != nil {
		return e
	}
	n, e := result.RowsAffected()
	if e == nil && n != 1 {
		return errors.New("media reservation no longer owned")
	}
	return e
}
func (s *MySQLStore) MarkMediaUnknown(ctx context.Context, hash, purpose, taskID string) error {
	_, e := s.DB.ExecContext(ctx, `UPDATE mysite_media SET status='needs_reconciliation' WHERE destination_account_id=? AND image_sha256=? AND purpose=? AND owner_task_id=? AND status='reserved'`, s.AccountID, hash, purpose, taskID)
	return e
}
