package sdk

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/rendis/pdf-forge/internal/core/port"
	"github.com/rendis/pdf-forge/internal/infra/config"
	"github.com/rendis/pdf-forge/internal/infra/logging"
	"github.com/rendis/pdf-forge/internal/migrations"
)

// Engine is the main entry point for pdf-forge.
// Create with New(), register extensions, then call Run().
type Engine struct {
	configFilePath string
	config         *config.Config
	i18nFilePath   string
	devFrontendURL string

	injectors         []port.Injector
	mapper            port.RequestMapper
	initFunc          port.InitFunc
	workspaceProvider port.WorkspaceInjectableProvider
}

// New creates a new Engine with the given options.
func New(opts ...Option) *Engine {
	e := &Engine{}
	for _, opt := range opts {
		opt(e)
	}
	return e
}

// RegisterInjector adds a custom injector to the engine.
// Multiple injectors can be registered.
func (e *Engine) RegisterInjector(inj port.Injector) *Engine {
	e.injectors = append(e.injectors, inj)
	return e
}

// RegisterMapper sets the request mapper for the engine.
// Only ONE mapper is allowed.
func (e *Engine) RegisterMapper(m port.RequestMapper) *Engine {
	e.mapper = m
	return e
}

// SetInitFunc sets the global initialization function.
// Runs once before all injectors on each render request.
func (e *Engine) SetInitFunc(fn port.InitFunc) *Engine {
	e.initFunc = fn
	return e
}

// SetWorkspaceInjectableProvider sets the provider for workspace-specific injectables.
// If set, the provider's GetInjectables is called when listing injectables,
// and ResolveInjectables is called during render for provider-owned codes.
func (e *Engine) SetWorkspaceInjectableProvider(p port.WorkspaceInjectableProvider) *Engine {
	e.workspaceProvider = p
	return e
}

// Run starts the engine: loads config, runs preflight checks,
// initializes all components, and starts the HTTP server.
// Blocks until shutdown signal (SIGINT/SIGTERM).
func (e *Engine) Run() error {
	ctx := context.Background()

	// Setup structured logging
	handler := logging.NewContextHandler(
		slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		}),
	)
	slog.SetDefault(slog.New(handler))

	slog.InfoContext(ctx, "starting pdf-forge engine")

	// Load configuration
	if err := e.loadConfig(); err != nil {
		return fmt.Errorf("config: %w", err)
	}

	// Apply runtime options to config
	if e.devFrontendURL != "" {
		e.config.DevFrontendURL = e.devFrontendURL
	}

	// Preflight checks
	if err := e.preflightChecks(ctx); err != nil {
		return err
	}

	// Initialize all components (manual DI)
	app, err := e.initialize(ctx)
	if err != nil {
		return fmt.Errorf("init: %w", err)
	}

	// Run with signal handling
	return e.runWithSignals(ctx, app)
}

// RunMigrations loads config and applies all pending database migrations.
func (e *Engine) RunMigrations() error {
	if err := e.loadConfig(); err != nil {
		return fmt.Errorf("config: %w", err)
	}
	return migrations.Run(&e.config.Database)
}

// RunMigrations is a standalone function that runs migrations with the given config file.
func RunMigrations(configFilePath string) error {
	cfg, err := config.LoadFromFile(configFilePath)
	if err != nil {
		return fmt.Errorf("config: %w", err)
	}
	return migrations.Run(&cfg.Database)
}

// loadConfig loads configuration from file or uses the provided config.
func (e *Engine) loadConfig() error {
	if e.config != nil {
		return nil
	}

	if e.configFilePath != "" {
		cfg, err := config.LoadFromFile(e.configFilePath)
		if err != nil {
			return err
		}
		e.config = cfg
		return nil
	}

	// Default: try standard locations
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	e.config = cfg
	return nil
}

// runWithSignals starts the app and waits for shutdown signal.
func (e *Engine) runWithSignals(ctx context.Context, app *appComponents) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	errChan := make(chan error, 1)
	go func() {
		if err := app.httpServer.Start(ctx); err != nil {
			errChan <- err
		}
	}()

	select {
	case sig := <-sigChan:
		slog.InfoContext(ctx, "received shutdown signal", slog.String("signal", sig.String()))
		cancel()
	case err := <-errChan:
		slog.ErrorContext(ctx, "server error", slog.String("error", err.Error()))
		return err
	}

	app.cleanup()
	slog.InfoContext(ctx, "pdf-forge engine stopped")
	return nil
}
