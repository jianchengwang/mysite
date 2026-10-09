package app

import (
	"errors"
	"net/url"
	"os"
	"strings"
	"time"
)

type Config struct {
	Address, APIKey, MySQLDSN, AppID, AppSecret string
	MiMoAPIKey                                  string
	Origins                                     []string
	DraftMode                                   string
	DraftRedisURL                               string
	DraftCacheTTL                               time.Duration
}

func LoadConfig() (Config, error) {
	c := Config{Address: os.Getenv("LISTEN_ADDR"), APIKey: os.Getenv("BACKEND_ACCESS_KEY"), MySQLDSN: os.Getenv("MYSQL_DSN"), AppID: os.Getenv("WECHAT_APP_ID"), AppSecret: os.Getenv("WECHAT_APP_SECRET")}
	c.DraftMode = strings.TrimSpace(os.Getenv("MP_DRAFT_MODE"))
	if c.DraftMode == "" {
		c.DraftMode = "legacy"
	}
	if c.DraftMode != "legacy" && c.DraftMode != "sync" {
		return c, errors.New("MP_DRAFT_MODE must be legacy or sync")
	}
	c.DraftCacheTTL = 24 * time.Hour
	if raw := os.Getenv("MP_DRAFT_CACHE_TTL"); raw != "" {
		ttl, err := time.ParseDuration(raw)
		if err != nil || ttl < time.Hour || ttl > 48*time.Hour {
			return c, errors.New("MP_DRAFT_CACHE_TTL must be between 1h and 48h")
		}
		c.DraftCacheTTL = ttl
	}
	c.DraftRedisURL = os.Getenv("MP_REDIS_URL")
	if c.DraftMode == "sync" && c.DraftRedisURL == "" {
		return c, errors.New("MP_REDIS_URL is required in synchronous mode")
	}
	c.MiMoAPIKey = strings.TrimSpace(os.Getenv("MIMO_API_KEY"))
	if c.Address == "" {
		c.Address = "127.0.0.1:8000"
	}
	if len(c.APIKey) < 32 {
		return c, errors.New("BACKEND_ACCESS_KEY must be set to at least 32 characters; authentication never fails open")
	}
	if c.MySQLDSN == "" {
		return c, errors.New("MYSQL_DSN is required")
	}
	if (c.AppID == "") != (c.AppSecret == "") {
		return c, errors.New("set both WECHAT_APP_ID and WECHAT_APP_SECRET, or neither")
	}
	for _, raw := range strings.Split(os.Getenv("CORS_ORIGINS"), ",") {
		if raw = strings.TrimSpace(raw); raw != "" {
			u, e := url.Parse(raw)
			if e != nil || u.Host == "" || (u.Scheme != "https" && u.Scheme != "http") || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
				return c, errors.New("CORS_ORIGINS requires exact HTTP(S) origins; wildcards are forbidden")
			}
			c.Origins = append(c.Origins, raw)
		}
	}
	return c, nil
}
