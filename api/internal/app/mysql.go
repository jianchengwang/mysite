package app

import (
	"context"
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	mysql "github.com/go-sql-driver/mysql"
	"strings"
	"time"
)

//go:embed migrations/*.sql
var migrations embed.FS

type MySQLStore struct {
	DB        *sql.DB
	AccountID string
}

func OpenMySQL(dsn, accountID string) (*MySQLStore, error) {
	cfg, e := mysql.ParseDSN(dsn)
	if e != nil {
		return nil, errors.New("invalid MYSQL_DSN")
	}
	if cfg.DBName == "" {
		return nil, errors.New("MYSQL_DSN must select a dedicated database")
	}
	cfg.ParseTime = true
	cfg.Loc = time.UTC
	cfg.Timeout = 5 * time.Second
	cfg.ReadTimeout = 10 * time.Second
	cfg.WriteTimeout = 10 * time.Second
	cfg.MultiStatements = false
	db, e := sql.Open("mysql", cfg.FormatDSN())
	if e != nil {
		return nil, errors.New("cannot configure MySQL")
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(3 * time.Minute)
	return &MySQLStore{DB: db, AccountID: accountID}, nil
}
func (s *MySQLStore) Ping(ctx context.Context) error { return s.DB.PingContext(ctx) }
func (s *MySQLStore) Migrate(ctx context.Context) error {
	// DDL is idempotent, but not transactional in MySQL. Never change existing migrations.
	if _, e := s.DB.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS mysite_schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`); e != nil {
		return e
	}
	files, e := migrations.ReadDir("migrations")
	if e != nil {
		return e
	}
	for _, file := range files {
		var n int
		e = s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM mysite_schema_migrations WHERE version=?`, file.Name()).Scan(&n)
		if e != nil {
			return e
		}
		if n > 0 {
			continue
		}
		data, e := migrations.ReadFile("migrations/" + file.Name())
		if e != nil {
			return e
		}
		for _, statement := range strings.Split(string(data), ";") {
			if strings.TrimSpace(statement) == "" {
				continue
			}
			if _, e = s.DB.ExecContext(ctx, statement); e != nil {
				return fmt.Errorf("migration %s failed: %w", file.Name(), e)
			}
		}
		if _, e = s.DB.ExecContext(ctx, `INSERT IGNORE INTO mysite_schema_migrations(version) VALUES (?)`, file.Name()); e != nil {
			return e
		}
	}
	return nil
}
func newID() string {
	var b [16]byte
	if _, e := rand.Read(b[:]); e != nil {
		panic(e)
	}
	return hex.EncodeToString(b[:])
}

const taskColumns = `destination_account_id,id,status,stage,request_hash,payload,result,error_message,created_at,updated_at`

type scanner interface{ Scan(...any) error }

func scanTask(row scanner) (Task, error) {
	var t Task
	var result []byte
	e := row.Scan(&t.DestinationAccountID, &t.ID, &t.Status, &t.Stage, &t.RequestHash, &t.Payload, &result, &t.Error, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(e, sql.ErrNoRows) {
		return t, ErrNotFound
	}
	t.Result = result
	return t, e
}
func (s *MySQLStore) Reserve(ctx context.Context, key, hash string, payload json.RawMessage) (Task, bool, error) {
	id := newID()
	_, e := s.DB.ExecContext(ctx, `INSERT INTO mysite_tasks (id,destination_account_id,idempotency_key,request_hash,payload) VALUES (?,?,?,?,?)`, id, s.AccountID, key, hash, []byte(payload))
	if e == nil {
		t, e := s.Get(ctx, id)
		return t, true, e
	}
	var me *mysql.MySQLError
	if !errors.As(e, &me) || me.Number != 1062 {
		return Task{}, false, e
	}
	t, e := scanTask(s.DB.QueryRowContext(ctx, `SELECT `+taskColumns+` FROM mysite_tasks WHERE destination_account_id=? AND idempotency_key=?`, s.AccountID, key))
	if e != nil {
		return t, false, e
	}
	if t.RequestHash != hash {
		return t, false, ErrConflict
	}
	return t, false, nil
}
func (s *MySQLStore) Get(ctx context.Context, id string) (Task, error) {
	return scanTask(s.DB.QueryRowContext(ctx, `SELECT `+taskColumns+` FROM mysite_tasks WHERE destination_account_id=? AND id=?`, s.AccountID, id))
}
func (s *MySQLStore) Claim(ctx context.Context) (*Task, error) {
	tx, e := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if e != nil {
		return nil, e
	}
	defer tx.Rollback()
	// Do not sort the JSON payload: a base64 cover can exceed MySQL's sort buffer.
	// Lock the small identifier first, then load that same row in this transaction.
	var id string
	e = tx.QueryRowContext(ctx, `SELECT id FROM mysite_tasks WHERE destination_account_id=? AND status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`, s.AccountID).Scan(&id)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	t, e := scanTask(tx.QueryRowContext(ctx, `SELECT `+taskColumns+` FROM mysite_tasks WHERE destination_account_id=? AND id=?`, s.AccountID, id))
	if e != nil {
		return nil, e
	}
	_, e = tx.ExecContext(ctx, `UPDATE mysite_tasks SET status='processing',stage='preparing',lease_expires_at=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 10 MINUTE) WHERE id=? AND status='queued'`, t.ID)
	if e != nil {
		return nil, e
	}
	if e = tx.Commit(); e != nil {
		return nil, e
	}
	t.Status = "processing"
	return &t, nil
}
func (s *MySQLStore) Checkpoint(ctx context.Context, id, stage string, result json.RawMessage) error {
	r, e := s.DB.ExecContext(ctx, `UPDATE mysite_tasks SET stage=?, result=? WHERE id=? AND status='processing'`, stage, []byte(result), id)
	if e != nil {
		return e
	}
	n, e := r.RowsAffected()
	if e == nil && n != 1 {
		return errors.New("task no longer owned")
	}
	return e
}
func (s *MySQLStore) Finish(ctx context.Context, id, status string, result json.RawMessage, message string) error {
	r, e := s.DB.ExecContext(ctx, `UPDATE mysite_tasks SET status=?,stage=?,result=?,error_message=?,lease_expires_at=NULL WHERE id=? AND status='processing'`, status, status, []byte(result), message, id)
	if e != nil {
		return e
	}
	n, e := r.RowsAffected()
	if e == nil && n != 1 {
		return errors.New("task no longer owned")
	}
	return e
}
func (s *MySQLStore) ReconcileExpired(ctx context.Context) error {
	_, e := s.DB.ExecContext(ctx, `UPDATE mysite_tasks SET status='needs_reconciliation',error_message='Worker lease expired. Check remote state before any new submission.' WHERE status='processing' AND lease_expires_at < UTC_TIMESTAMP(6)`)
	return e
}
