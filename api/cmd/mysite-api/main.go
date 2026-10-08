package main

import (
	"context"
	"flag"
	"github.com/jianchengwang/mysite/api/internal/app"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	migrate := flag.Bool("migrate", false, "Apply embedded MySQL migrations, then exit")
	content := flag.String("import-content", "", "Transactionally import a Nuxt content directory to MySQL, then exit")
	flag.Parse()
	config, e := app.LoadConfig()
	if e != nil {
		slog.Error(e.Error())
		os.Exit(1)
	}
	store, e := app.OpenMySQL(config.MySQLDSN, config.AppID)
	if e != nil {
		slog.Error("MySQL configuration failed; check MYSQL_DSN")
		os.Exit(1)
	}
	defer store.DB.Close()
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	pingCtx, pingCancel := context.WithTimeout(ctx, 5*time.Second)
	e = store.Ping(pingCtx)
	pingCancel()
	if e != nil {
		slog.Error("MySQL unavailable; server will not start without durable storage")
		os.Exit(1)
	}
	if *migrate {
		if e = store.Migrate(ctx); e != nil {
			slog.Error("migration failed; inspect schema and migration documentation")
			os.Exit(1)
		}
		slog.Info("migrations applied")
		return
	}
	if *content != "" {
		count, e := store.ImportContent(ctx, *content)
		if e != nil {
			slog.Error("content import failed; transaction rolled back")
			os.Exit(1)
		}
		slog.Info("content imported", "files", count)
		return
	}
	var schema int
	if e = store.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM mysite_schema_migrations WHERE version='001_initial.sql'`).Scan(&schema); e != nil || schema != 1 {
		slog.Error("schema not ready; run the explicit -migrate command first")
		os.Exit(1)
	}
	worker := &app.Worker{AccountID: config.AppID, Store: store, Publisher: app.NewWeChat(config.AppID, config.AppSecret), Images: app.SafeImageClient()}
	go worker.Run(ctx)
	server := app.HTTPServer(config.Address, (&app.Server{Config: config, Store: store, Content: store, TTS: app.NewTTSService(app.NewMiMoTTS(config.MiMoAPIKey))}).Handler())
	go func() {
		<-ctx.Done()
		shutdownCtx, c := context.WithTimeout(context.Background(), 10*time.Second)
		defer c()
		_ = server.Shutdown(shutdownCtx)
	}()
	slog.Info("mysite API started", "address", config.Address, "wechat_configured", config.AppID != "")
	if e = server.ListenAndServe(); e != nil && e != http.ErrServerClosed {
		slog.Error("HTTP server failed")
		os.Exit(1)
	}
}
