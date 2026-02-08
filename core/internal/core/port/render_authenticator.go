package port

import "github.com/gin-gonic/gin"

// RenderAuthenticator defines custom authentication for render endpoints.
// When registered via engine.SetRenderAuthenticator(), it replaces OIDC for
// render routes while panel OIDC continues working for login/UI.
type RenderAuthenticator interface {
	// Authenticate validates the request and returns claims on success.
	// Return (nil, error) to reject with 401 Unauthorized.
	Authenticate(c *gin.Context) (*RenderAuthClaims, error)
}

// RenderAuthClaims contains authenticated caller information.
type RenderAuthClaims struct {
	UserID   string         // Caller identifier (required for audit/tracing)
	Email    string         // Optional
	Name     string         // Optional
	Provider string         // Auth provider/method name (e.g., "api-key", "custom-jwt")
	Extra    map[string]any // Custom claims accessible via middleware.GetRenderAuthExtra()
}
