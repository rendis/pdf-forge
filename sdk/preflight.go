package sdk

import (
	"context"
	"fmt"
	"log/slog"
	"os/exec"
	"runtime"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres"
)

// preflightChecks runs all startup validations.
func (e *Engine) preflightChecks(ctx context.Context) error {
	if err := checkTypst(ctx, e.config.Typst.BinPath); err != nil {
		return err
	}

	pool, err := checkDatabase(ctx, e)
	if err != nil {
		return err
	}
	pool.Close()

	if err := checkSchema(ctx, e); err != nil {
		return err
	}

	checkAuth(ctx, e)
	return nil
}

// checkTypst verifies the Typst CLI is installed and accessible.
func checkTypst(ctx context.Context, binPath string) error {
	if binPath == "" {
		binPath = "typst"
	}

	out, err := exec.CommandContext(ctx, binPath, "--version").CombinedOutput()
	if err != nil {
		return fmt.Errorf(`typst CLI not found (%s)

Typst is required for PDF rendering. Install it:

  macOS:   brew install typst
  Linux:   curl -fsSL https://typst.community | sh
  Cargo:   cargo install typst-cli
  Windows: winget install typst

More info: https://github.com/typst/typst#installation`, binPath)
	}

	version := strings.TrimSpace(string(out))
	slog.InfoContext(ctx, "typst CLI found", slog.String("version", version), slog.String("os", runtime.GOOS))
	return nil
}

// checkDatabase verifies the database is reachable.
func checkDatabase(ctx context.Context, e *Engine) (*pgxpool.Pool, error) {
	pool, err := postgres.NewPool(ctx, &e.config.Database)
	if err != nil {
		return nil, fmt.Errorf("database unreachable: %w\n\nCheck your database configuration:\n  host: %s\n  port: %d\n  name: %s\n  user: %s\n\nMake sure PostgreSQL is running and accessible",
			err,
			e.config.Database.Host,
			e.config.Database.Port,
			e.config.Database.Name,
			e.config.Database.User,
		)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	slog.InfoContext(ctx, "database connection OK",
		slog.String("host", e.config.Database.Host),
		slog.Int("port", e.config.Database.Port),
		slog.String("name", e.config.Database.Name),
	)
	return pool, nil
}

// checkSchema verifies the database schema is initialized.
func checkSchema(ctx context.Context, e *Engine) error {
	pool, err := postgres.NewPool(ctx, &e.config.Database)
	if err != nil {
		return err
	}
	defer pool.Close()

	// Check for a known table to verify schema exists
	var exists bool
	err = pool.QueryRow(ctx,
		`SELECT EXISTS (
			SELECT FROM information_schema.tables
			WHERE table_schema = 'tenancy' AND table_name = 'tenants'
		)`,
	).Scan(&exists)

	if err != nil || !exists {
		return fmt.Errorf(`database schema not initialized

Run migrations first:
  pdfforge-cli migrate

Or programmatically:
  sdk.RunMigrations(cfg)`)
	}

	slog.InfoContext(ctx, "database schema OK")
	return nil
}

// checkAuth checks auth configuration and logs dummy mode warning.
func checkAuth(ctx context.Context, e *Engine) {
	providers := e.config.GetOIDCProviders()

	if len(providers) == 0 {
		slog.WarnContext(ctx, "⚠ OIDC not configured — running in dummy mode (dev only)")
		e.config.DummyAuth = true
		return
	}

	slog.InfoContext(ctx, "OIDC providers configured", slog.Int("count", len(providers)))
	for _, p := range providers {
		if p.Issuer == "" {
			slog.WarnContext(ctx, "OIDC provider missing issuer", slog.String("name", p.Name))
		}
		if p.JWKSURL == "" {
			slog.WarnContext(ctx, "OIDC provider missing jwks_url", slog.String("name", p.Name))
		}
		slog.InfoContext(ctx, "OIDC provider",
			slog.String("name", p.Name),
			slog.String("issuer", p.Issuer))
	}
}
