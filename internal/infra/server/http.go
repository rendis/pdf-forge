package server

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/rendis/pdf-forge/internal/adapters/primary/http/controller"
	"github.com/rendis/pdf-forge/internal/adapters/primary/http/middleware"
	"github.com/rendis/pdf-forge/internal/frontend"
	"github.com/rendis/pdf-forge/internal/infra/config"

	_ "github.com/rendis/pdf-forge/docs" // swagger generated docs
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

// HTTPServer represents the HTTP server instance.
type HTTPServer struct {
	engine *gin.Engine
	config *config.ServerConfig
}

// NewHTTPServer creates a new HTTP server with all routes and middleware configured.
func NewHTTPServer(
	cfg *config.Config,
	middlewareProvider *middleware.Provider,
	workspaceController *controller.WorkspaceController,
	injectableController *controller.ContentInjectableController,
	templateController *controller.ContentTemplateController,
	adminController *controller.AdminController,
	meController *controller.MeController,
	tenantController *controller.TenantController,
	documentTypeController *controller.DocumentTypeController,
	internalRenderController *controller.InternalRenderController,
) *HTTPServer {
	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()

	// Global middleware
	engine.Use(gin.Recovery())
	engine.Use(gin.Logger())
	engine.Use(corsMiddleware())

	// Health check endpoint (no auth required)
	engine.GET("/health", healthHandler)
	engine.GET("/ready", readyHandler)

	// Client config endpoint (no auth required)
	engine.GET("/api/v1/config", clientConfigHandler(cfg))

	// Swagger UI (enabled via DOC_ENGINE_SERVER_SWAGGER_UI=true)
	if cfg.Server.SwaggerUI {
		engine.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// API v1 routes with authentication
	v1 := engine.Group("/api/v1")
	v1.Use(middleware.Operation())

	if cfg.DummyAuth {
		// Dummy auth mode: skip JWT, inject fixed superadmin identity
		v1.Use(middleware.DummyAuth())
		v1.Use(middleware.DummyIdentityAndRoles(cfg.DummyAuthUserID))
	} else {
		v1.Use(middleware.JWTAuth(&cfg.Auth))
		v1.Use(middlewareProvider.IdentityContext())
		v1.Use(middlewareProvider.SystemRoleContext())
	}
	{
		// Placeholder ping endpoint
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		// =====================================================
		// SYSTEM ROUTES - No X-Workspace-ID or X-Tenant-ID required
		// Requires system roles (SUPERADMIN or PLATFORM_ADMIN)
		// =====================================================
		adminController.RegisterRoutes(v1)

		// =====================================================
		// ME ROUTES - User-specific routes, no tenant/workspace required
		// Only requires authentication
		// =====================================================
		meController.RegisterRoutes(v1)

		// =====================================================
		// TENANT ROUTES - Requires X-Tenant-ID header
		// Requires tenant roles (TENANT_OWNER or TENANT_ADMIN)
		// =====================================================
		tenantController.RegisterRoutes(v1, middlewareProvider)
		documentTypeController.RegisterRoutes(v1, middlewareProvider)

		// =====================================================
		// WORKSPACE ROUTES - Requires X-Workspace-ID header
		// Operations within a specific workspace
		// =====================================================
		workspaceController.RegisterRoutes(v1, middlewareProvider)

		// =====================================================
		// CONTENT ROUTES - Requires X-Workspace-ID header
		// =====================================================
		injectableController.RegisterRoutes(v1, middlewareProvider)
		templateController.RegisterRoutes(v1, middlewareProvider)
	}

	// =====================================================
	// INTERNAL ROUTES - API key authentication only
	// Service-to-service communication
	// =====================================================
	internalRenderController.RegisterRoutes(engine)

	// =====================================================
	// EMBEDDED FRONTEND (SPA)
	// Serves the React SPA for all non-API routes.
	// In dev mode, proxies to the frontend dev server.
	// =====================================================
	if cfg.DevFrontendURL != "" {
		setupDevProxy(engine, cfg.DevFrontendURL)
	} else {
		setupEmbeddedFrontend(engine)
	}

	return &HTTPServer{
		engine: engine,
		config: &cfg.Server,
	}
}

// Start starts the HTTP server.
func (s *HTTPServer) Start(ctx context.Context) error {
	addr := fmt.Sprintf(":%s", s.config.Port)

	srv := &http.Server{
		Addr:         addr,
		Handler:      s.engine,
		ReadTimeout:  s.config.ReadTimeoutDuration(),
		WriteTimeout: s.config.WriteTimeoutDuration(),
	}

	// Channel to catch server errors
	errChan := make(chan error, 1)

	// Start server in goroutine
	go func() {
		slog.InfoContext(ctx, "starting HTTP server", slog.String("addr", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	// Wait for context cancellation or server error
	select {
	case <-ctx.Done():
		slog.InfoContext(ctx, "shutting down HTTP server")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), s.config.ShutdownTimeoutDuration())
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("server shutdown: %w", err)
		}
		slog.InfoContext(shutdownCtx, "HTTP server stopped gracefully")
		return nil

	case err := <-errChan:
		return fmt.Errorf("server error: %w", err)
	}
}

// Engine returns the underlying Gin engine.
// Useful for testing.
func (s *HTTPServer) Engine() *gin.Engine {
	return s.engine
}

// healthHandler returns OK if the service is running.
func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "pdf-forge",
	})
}

// readyHandler returns OK if the service is ready to accept traffic.
func readyHandler(c *gin.Context) {
	// TODO: Add database connectivity check
	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// setupEmbeddedFrontend serves the embedded React SPA for all non-API routes.
func setupEmbeddedFrontend(engine *gin.Engine) {
	distFS, err := frontend.DistFS()
	if err != nil {
		slog.Warn("failed to load embedded frontend", slog.String("error", err.Error()))
		return
	}

	fileServer := http.FileServer(http.FS(distFS))

	engine.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Skip API routes
		if strings.HasPrefix(path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		// Try to serve the file directly
		if f, err := fs.Stat(distFS, strings.TrimPrefix(path, "/")); err == nil && !f.IsDir() {
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}

		// SPA fallback: serve index.html
		c.Request.URL.Path = "/"
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
}

// setupDevProxy proxies non-API requests to the frontend dev server.
func setupDevProxy(engine *gin.Engine, devURL string) {
	target, err := url.Parse(devURL)
	if err != nil {
		slog.Warn("invalid dev frontend URL", slog.String("url", devURL), slog.String("error", err.Error()))
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	slog.Info("proxying frontend to dev server", slog.String("url", devURL))

	engine.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	})
}

// clientConfigHandler returns a handler that exposes non-sensitive config to the frontend.
func clientConfigHandler(cfg *config.Config) gin.HandlerFunc {
	type clientConfig struct {
		DummyAuth  bool   `json:"dummyAuth"`
		AuthIssuer string `json:"authIssuer,omitempty"`
	}

	resp := clientConfig{
		DummyAuth:  cfg.DummyAuth,
		AuthIssuer: cfg.Auth.Issuer,
	}

	return func(c *gin.Context) {
		c.JSON(http.StatusOK, resp)
	}
}

// corsMiddleware configures CORS for the API.
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Workspace-ID, X-Tenant-ID, X-API-Key, X-External-ID, X-Template-ID, X-Transactional-ID")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
