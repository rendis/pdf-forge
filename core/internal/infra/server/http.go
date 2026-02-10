package server

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"mime"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/rendis/pdf-forge/core/internal/adapters/primary/http/controller"
	"github.com/rendis/pdf-forge/core/internal/adapters/primary/http/middleware"
	"github.com/rendis/pdf-forge/core/internal/core/port"
	"github.com/rendis/pdf-forge/core/internal/infra/config"

	_ "github.com/rendis/pdf-forge/core/docs" // swagger generated docs
)

func init() {
	// Register MIME types to avoid OS-level detection inconsistencies (especially on Windows).
	_ = mime.AddExtensionType(".js", "application/javascript")
	_ = mime.AddExtensionType(".css", "text/css")
	_ = mime.AddExtensionType(".woff2", "font/woff2")
	_ = mime.AddExtensionType(".svg", "image/svg+xml")
}

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
	renderController *controller.RenderController,
	globalMiddleware []gin.HandlerFunc,
	apiMiddleware []gin.HandlerFunc,
	renderAuthenticator port.RenderAuthenticator,
	frontendFS fs.FS,
) *HTTPServer {
	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()

	// Global middleware
	engine.Use(gin.Recovery())
	engine.Use(gin.Logger())
	engine.Use(corsMiddleware(cfg.Server.CORS))

	// User-provided global middleware (after CORS, before routes)
	for _, mw := range globalMiddleware {
		engine.Use(mw)
	}

	// Base path group (e.g. "/pdf-forge" → all routes under /pdf-forge/*)
	basePath := cfg.Server.NormalizedBasePath()
	var base gin.IRouter = &engine.RouterGroup
	if basePath != "" {
		base = engine.Group(basePath)
	}

	// Health check endpoint (no auth required)
	base.GET("/health", healthHandler)
	base.GET("/ready", readyHandler)

	// Client config endpoint (no auth required)
	base.GET("/api/v1/config", clientConfigHandler(cfg))

	// Swagger UI (enabled via DOC_ENGINE_SERVER_SWAGGER_UI=true)
	if cfg.Server.SwaggerUI {
		base.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// =====================================================
	// PANEL ROUTES - Full auth with identity lookup
	// Uses auth.panel provider for login/UI/management
	// =====================================================
	// Request timeout: slightly less than WriteTimeout so the handler's context
	// cancels before the HTTP server closes the connection. This prevents goroutine
	// leaks when the DB pool is exhausted and queries block indefinitely.
	requestTimeout := cfg.Server.WriteTimeoutDuration() - 2*time.Second
	if requestTimeout <= 0 {
		requestTimeout = 28 * time.Second
	}

	v1 := base.Group("/api/v1")
	v1.Use(noCacheAPI())
	v1.Use(middleware.Operation())
	v1.Use(middleware.RequestTimeout(requestTimeout))

	if cfg.IsDummyAuth() {
		// Dummy auth mode: skip JWT, inject fixed superadmin identity
		v1.Use(middleware.DummyAuth())
		v1.Use(middleware.DummyIdentityAndRoles(cfg.DummyAuthUserID))
	} else {
		// Panel auth: validates token against panel OIDC provider only
		v1.Use(middleware.PanelAuth(cfg))
		v1.Use(middlewareProvider.IdentityContext())
		v1.Use(middlewareProvider.SystemRoleContext())
	}

	// User-provided API middleware (after auth, before controllers)
	for _, mw := range apiMiddleware {
		v1.Use(mw)
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
		// Operations within a specific workspace (panel auth)
		// =====================================================
		workspaceController.RegisterRoutes(v1, middlewareProvider)

		// =====================================================
		// CONTENT ROUTES - Requires X-Workspace-ID header
		// =====================================================
		injectableController.RegisterRoutes(v1, middlewareProvider)
		templateController.RegisterRoutes(v1, middlewareProvider)
	}

	// =====================================================
	// RENDER ROUTES - Separate auth, no identity lookup
	// Auth priority: dummy > custom RenderAuthenticator > OIDC
	// Custom authorization via engine.UseAPIMiddleware().
	// =====================================================
	renderGroup := base.Group("/api/v1/workspace")
	renderGroup.Use(noCacheAPI())
	renderGroup.Use(middleware.Operation())
	renderGroup.Use(middleware.RequestTimeout(requestTimeout))

	switch {
	case cfg.IsDummyAuth():
		renderGroup.Use(middleware.DummyAuth())
	case renderAuthenticator != nil:
		renderGroup.Use(middleware.CustomRenderAuth(renderAuthenticator))
	default:
		renderGroup.Use(middleware.RenderAuth(cfg))
		renderGroup.Use(middleware.RenderClaimsContext())
	}

	// User-provided API middleware for render routes
	for _, mw := range apiMiddleware {
		renderGroup.Use(mw)
	}

	renderController.RegisterWorkspaceRoutes(renderGroup)

	// NoRoute handler: serves embedded SPA or returns JSON 404
	engine.NoRoute(spaHandler(frontendFS, basePath))

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

// clientConfigHandler returns a handler that exposes non-sensitive config to the frontend.
func clientConfigHandler(cfg *config.Config) gin.HandlerFunc {
	type providerInfo struct {
		Name               string `json:"name"`
		Issuer             string `json:"issuer"`
		TokenEndpoint      string `json:"tokenEndpoint,omitempty"`
		UserinfoEndpoint   string `json:"userinfoEndpoint,omitempty"`
		EndSessionEndpoint string `json:"endSessionEndpoint,omitempty"`
		ClientID           string `json:"clientId,omitempty"`
	}

	type clientConfig struct {
		DummyAuth     bool          `json:"dummyAuth"`
		BasePath      string        `json:"basePath"`
		PanelProvider *providerInfo `json:"panelProvider,omitempty"`
	}

	var panelProvider *providerInfo
	if panel := cfg.GetPanelOIDC(); panel != nil {
		panelProvider = &providerInfo{
			Name:               panel.Name,
			Issuer:             panel.Issuer,
			TokenEndpoint:      panel.TokenEndpoint,
			UserinfoEndpoint:   panel.UserinfoEndpoint,
			EndSessionEndpoint: panel.EndSessionEndpoint,
			ClientID:           panel.ClientID,
		}
	}

	resp := clientConfig{
		DummyAuth:     cfg.IsDummyAuth(),
		BasePath:      cfg.Server.NormalizedBasePath(),
		PanelProvider: panelProvider,
	}

	return func(c *gin.Context) {
		c.JSON(http.StatusOK, resp)
	}
}

// noCacheAPI ensures browsers never cache API responses.
// Without explicit Cache-Control headers, Chrome applies heuristic caching to GET
// requests, which can cause stale or corrupted cache entries that result in requests
// stuck as "pending" indefinitely -- even across page reloads.
func noCacheAPI() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

// stripBasePath removes the basePath prefix from reqPath.
// Returns the stripped path and true, or empty and false if the prefix doesn't match.
func stripBasePath(reqPath, basePath string) (string, bool) {
	if basePath == "" {
		return reqPath, true
	}
	if !strings.HasPrefix(reqPath, basePath) {
		return "", false
	}
	stripped := strings.TrimPrefix(reqPath, basePath)
	if stripped == "" {
		return "/", true
	}
	return stripped, true
}

// isBackendPath returns true if the path belongs to backend-owned prefixes.
func isBackendPath(p string) bool {
	return strings.HasPrefix(p, "/api/") || strings.HasPrefix(p, "/swagger/")
}

// spaHandler returns a Gin handler that serves the embedded SPA frontend.
// Explicit routes (/health, /ready, /api/v1/*) are matched by Gin before NoRoute.
// This handler only runs for unmatched paths: static files get served with cache
// headers, unknown paths get index.html (SPA client-side routing).
// basePath is stripped from the request URL before filesystem lookup.
func spaHandler(fsys fs.FS, basePath string) gin.HandlerFunc {
	var fileServer http.Handler
	if fsys != nil {
		fileServer = http.StripPrefix(basePath, http.FileServer(http.FS(fsys)))
	}

	return func(c *gin.Context) {
		stripped, ok := stripBasePath(c.Request.URL.Path, basePath)
		if !ok || isBackendPath(stripped) || fsys == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		// Normalize path for fs lookup
		cleanPath := path.Clean(strings.TrimPrefix(stripped, "/"))
		if cleanPath == "." || cleanPath == "" {
			cleanPath = "index.html"
		}

		// Try serving the exact file
		f, err := fsys.Open(cleanPath)
		if err == nil {
			f.Close()
			if strings.HasPrefix(cleanPath, "assets/") {
				c.Header("Cache-Control", "public, max-age=31536000, immutable")
			}
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}

		// SPA fallback → serve index.html
		serveIndexHTML(c, fsys)
	}
}

// serveIndexHTML serves index.html with no-cache headers for SPA fallback routing.
func serveIndexHTML(c *gin.Context, fsys fs.FS) {
	indexFile, err := fsys.Open("index.html")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	defer indexFile.Close()

	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Content-Type", "text/html; charset=utf-8")
	stat, _ := indexFile.Stat()

	if rs, ok := indexFile.(io.ReadSeeker); ok {
		http.ServeContent(c.Writer, c.Request, "index.html", stat.ModTime(), rs)
		return
	}

	// Fallback if fs.File doesn't implement ReadSeeker
	content, err := io.ReadAll(indexFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read index"})
		return
	}
	c.Data(http.StatusOK, "text/html; charset=utf-8", content)
}

// corsMiddleware configures CORS for the API using allowed origins from config.
// Access-Control-Allow-Origin only accepts a single origin or "*".
// When multiple origins are configured, we check the request Origin header
// and respond with that origin if it's in the allowed list.
func corsMiddleware(corsCfg config.CORSConfig) gin.HandlerFunc {
	allowed := make(map[string]bool, len(corsCfg.AllowedOrigins))
	wildcard := false
	for _, o := range corsCfg.AllowedOrigins {
		if o == "*" {
			wildcard = true
		}
		allowed[o] = true
	}
	if len(corsCfg.AllowedOrigins) == 0 {
		wildcard = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if wildcard {
			c.Header("Access-Control-Allow-Origin", "*")
		} else if allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-Workspace-ID, X-Tenant-ID, X-Tenant-Code, X-Workspace-Code, X-External-ID, X-Template-ID, X-Transactional-ID")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
