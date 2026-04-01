package main

import (
	"log/slog"
	"os"

	"github.com/rendis/pdf-forge/core/cmd/api/bootstrap"
	"github.com/rendis/pdf-forge/core/extensions"
)

// @title           Doc Engine API
// @version         1.0
// @description     Document Assembly System API - Template management and document generation

// @contact.name    API Support
// @contact.email   support@example.com

// @license.name    MIT
// @license.url     https://opensource.org/licenses/MIT

// @host            localhost:8080
// @BasePath        /api/v1

// @securityDefinitions.apikey BearerAuth
// @in              header
// @name            Authorization
// @description     Type "Bearer" followed by a space and JWT token

func resolveSettingsPath(paths ...string) string {
	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	return paths[0]
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		engine := bootstrap.New()
		if err := engine.RunMigrations(); err != nil {
			slog.Error("migration failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
		return
	}

	engine := bootstrap.New().
		SetI18nFilePath(resolveSettingsPath(
			"settings/injectors.i18n.yaml",
			"core/settings/injectors.i18n.yaml",
		))
	extensions.Register(engine)

	if err := engine.Run(); err != nil {
		slog.Error("failed to run engine", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
