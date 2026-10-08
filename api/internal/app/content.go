package app

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Content struct {
	Path       string    `json:"path"`
	SHA256     string    `json:"sha256"`
	Body       string    `json:"body,omitempty"`
	ImportedAt time.Time `json:"imported_at"`
}
type ContentStore interface {
	ListContent(context.Context) ([]Content, error)
	GetContent(context.Context, string) (Content, error)
}

// Keep archived Store stories in persistent storage while withdrawing API reads.
func retiredStoreContentPath(path string) bool {
	switch path {
	case "store/wenroudao.md", "store/changanluan.md", "store/mingyuelei.md":
		return true
	default:
		return false
	}
}

func (s *MySQLStore) ListContent(ctx context.Context) ([]Content, error) {
	rows, e := s.DB.QueryContext(ctx, `SELECT path,content_sha256,imported_at FROM mysite_content ORDER BY path`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []Content{}
	for rows.Next() {
		var c Content
		if e = rows.Scan(&c.Path, &c.SHA256, &c.ImportedAt); e != nil {
			return nil, e
		}
		if !retiredStoreContentPath(c.Path) {
			out = append(out, c)
		}
	}
	return out, rows.Err()
}
func (s *MySQLStore) GetContent(ctx context.Context, path string) (Content, error) {
	if retiredStoreContentPath(path) {
		return Content{}, sql.ErrNoRows
	}
	var c Content
	e := s.DB.QueryRowContext(ctx, `SELECT path,content_sha256,body,imported_at FROM mysite_content WHERE path=?`, path).Scan(&c.Path, &c.SHA256, &c.Body, &c.ImportedAt)
	return c, e
}
func (s *MySQLStore) ImportContent(ctx context.Context, root string) (int, error) {
	absolute, e := filepath.Abs(root)
	if e != nil {
		return 0, e
	}
	info, e := os.Stat(absolute)
	if e != nil || !info.IsDir() {
		return 0, errors.New("content source must be a directory")
	}
	tx, e := s.DB.BeginTx(ctx, nil)
	if e != nil {
		return 0, e
	}
	defer tx.Rollback()
	count := 0
	e = filepath.WalkDir(absolute, func(path string, entry fs.DirEntry, walkError error) error {
		if walkError != nil {
			return walkError
		}
		if entry.Type()&os.ModeSymlink != 0 {
			return errors.New("content import rejects symlinks")
		}
		if entry.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".md" && ext != ".json" && ext != ".yml" && ext != ".yaml" {
			return nil
		}
		info, e := entry.Info()
		if e != nil {
			return e
		}
		if info.Size() > 8<<20 {
			return errors.New("content file exceeds 8 MiB")
		}
		data, e := os.ReadFile(path)
		if e != nil {
			return e
		}
		relative, e := filepath.Rel(absolute, path)
		if e != nil {
			return e
		}
		hash := sha256.Sum256(data)
		_, e = tx.ExecContext(ctx, `INSERT INTO mysite_content(path,content_sha256,body) VALUES(?,?,?) ON DUPLICATE KEY UPDATE content_sha256=VALUES(content_sha256),body=VALUES(body)`, filepath.ToSlash(relative), hex.EncodeToString(hash[:]), string(data))
		if e == nil {
			count++
		}
		return e
	})
	if e != nil {
		return 0, e
	}
	if e = tx.Commit(); e != nil {
		return 0, e
	}
	return count, nil
}
