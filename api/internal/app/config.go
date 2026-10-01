package app

import (
	"errors"
	"net/url"
	"os"
	"strings"
)

type Config struct {
	Address, APIKey, MySQLDSN, AppID, AppSecret string
	Origins                                     []string
}

func LoadConfig() (Config, error) {
	c := Config{Address: os.Getenv("LISTEN_ADDR"), APIKey: os.Getenv("BACKEND_ACCESS_KEY"), MySQLDSN: os.Getenv("MYSQL_DSN"), AppID: os.Getenv("WECHAT_APP_ID"), AppSecret: os.Getenv("WECHAT_APP_SECRET")}
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
