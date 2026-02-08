package bootstrap

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"

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

	injectors           []port.Injector
	mapper              port.RequestMapper
	initFunc            port.InitFunc
	workspaceProvider   port.WorkspaceInjectableProvider
	renderAuthenticator port.RenderAuthenticator

	// Middleware
	globalMiddleware []gin.HandlerFunc // Applied to all routes (after CORS, before auth)
	apiMiddleware    []gin.HandlerFunc // Applied to /api/v1/* routes (after auth)

	// Lifecycle hooks
	onStartHooks    []func(ctx context.Context) error // Run after config/preflight, before HTTP server
	onShutdownHooks []func(ctx context.Context) error // Run after HTTP server stops, before exit
}

// New creates a new Engine with default configuration.
func New() *Engine {
	return &Engine{}
}

// NewWithConfig creates a new Engine that loads config from the given file path.
func NewWithConfig(configPath string) *Engine {
	return &Engine{
		configFilePath: configPath,
	}
}

// SetI18nFilePath sets the path to user-provided i18n translations file.
func (e *Engine) SetI18nFilePath(path string) *Engine {
	e.i18nFilePath = path
	return e
}

// RegisterInjector adds a custom injector to the engine.
// Multiple injectors can be registered.
func (e *Engine) RegisterInjector(inj port.Injector) *Engine {
	e.injectors = append(e.injectors, inj)
	return e
}

// SetMapper sets the request mapper for render requests.
// Only ONE mapper is supported.
func (e *Engine) SetMapper(m port.RequestMapper) *Engine {
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

// SetRenderAuthenticator sets custom authentication for render endpoints.
// When set, it replaces OIDC auth for render while panel OIDC continues working.
func (e *Engine) SetRenderAuthenticator(auth port.RenderAuthenticator) *Engine {
	e.renderAuthenticator = auth
	return e
}

// GetRenderAuthenticator returns the registered render authenticator, or nil if not set.
func (e *Engine) GetRenderAuthenticator() port.RenderAuthenticator {
	return e.renderAuthenticator
}

// UseMiddleware adds middleware to be applied globally to all routes.
// Execution order: Recovery -> Logger -> CORS -> [User Global Middleware] -> Routes
// Use for logging, tracing, custom headers, etc.
func (e *Engine) UseMiddleware(mw gin.HandlerFunc) *Engine {
	e.globalMiddleware = append(e.globalMiddleware, mw)
	return e
}

// UseAPIMiddleware adds middleware to /api/v1/* routes only.
// Execution order: Operation -> Auth -> Identity -> Roles -> [User API Middleware] -> Controller
// Use for rate limiting, tenant validation, custom authorization, etc.
func (e *Engine) UseAPIMiddleware(mw gin.HandlerFunc) *Engine {
	e.apiMiddleware = append(e.apiMiddleware, mw)
	return e
}

// OnStart registers a hook that runs AFTER config/preflight, BEFORE HTTP server starts.
// Hooks run synchronously in registration order.
// For background processes (schedulers, workers), spawn a goroutine inside the hook.
func (e *Engine) OnStart(fn func(ctx context.Context) error) *Engine {
	e.onStartHooks = append(e.onStartHooks, fn)
	return e
}

// OnShutdown registers a hook that runs AFTER HTTP server stops, BEFORE exit.
// Hooks run synchronously in REVERSE registration order (LIFO).
// Use to gracefully stop background processes started in OnStart.
func (e *Engine) OnShutdown(fn func(ctx context.Context) error) *Engine {
	e.onShutdownHooks = append(e.onShutdownHooks, fn)
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

	// Run OnStart hooks (sync, in registration order)
	for i, hook := range e.onStartHooks {
		if err := hook(ctx); err != nil {
			return fmt.Errorf("onStart hook %d: %w", i, err)
		}
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	errChan := make(chan error, 1)
	go func() {
		if err := app.httpServer.Start(ctx); err != nil {
			errChan <- err
		}
	}()

	// Startup banner
	port := e.config.Server.Port
	fmt.Println()
	fmt.Println("  pdf-forge is running")
	fmt.Println()
	fmt.Printf("  API:       http://localhost:%s\n", port)
	if e.config.Server.SwaggerUI {
		fmt.Printf("  Swagger:   http://localhost:%s/swagger/index.html\n", port)
	}
	fmt.Printf("  Health:    http://localhost:%s/health\n", port)
	fmt.Printf("  Frontend:  http://localhost:3000\n")
	fmt.Println()

	select {
	case sig := <-sigChan:
		slog.InfoContext(ctx, "received shutdown signal", slog.String("signal", sig.String()))
		cancel()
	case err := <-errChan:
		slog.ErrorContext(ctx, "server error", slog.String("error", err.Error()))
		return err
	}

	// Run OnShutdown hooks (sync, reverse order - LIFO)
	for i := len(e.onShutdownHooks) - 1; i >= 0; i-- {
		if err := e.onShutdownHooks[i](ctx); err != nil {
			slog.ErrorContext(ctx, "onShutdown hook error", slog.Int("hook", i), slog.Any("error", err))
		}
	}

	app.cleanup()
	slog.InfoContext(ctx, "pdf-forge engine stopped")
	return nil
}
