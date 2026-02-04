package middleware

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/internal/core/port"
)

const renderAuthExtraKey = "render_auth_extra"

// CustomRenderAuth creates middleware using a custom RenderAuthenticator.
// Claims are stored in context using the same keys as OIDC for compatibility.
func CustomRenderAuth(auth port.RenderAuthenticator) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		claims, err := auth.Authenticate(c)
		if err != nil {
			slog.WarnContext(c.Request.Context(), "custom render auth failed",
				slog.String("error", err.Error()),
				slog.String("operation_id", GetOperationID(c)),
			)
			abortWithError(c, http.StatusUnauthorized, err)
			return
		}

		storeRenderClaims(c, claims)
		c.Next()
	}
}

// storeRenderClaims stores RenderAuthClaims in gin context.
// Uses the same keys as OIDC for compatibility with existing code.
func storeRenderClaims(c *gin.Context, claims *port.RenderAuthClaims) {
	if claims.UserID != "" {
		c.Set(userIDKey, claims.UserID)
	}
	if claims.Email != "" {
		c.Set(userEmailKey, claims.Email)
	}
	if claims.Name != "" {
		c.Set(userNameKey, claims.Name)
	}
	if claims.Provider != "" {
		c.Set(oidcProviderKey, claims.Provider)
	}
	if claims.Extra != nil {
		c.Set(renderAuthExtraKey, claims.Extra)
	}
}

// GetRenderAuthExtra retrieves extra claims from custom render auth.
// Returns nil if not using custom auth or if Extra was not set.
func GetRenderAuthExtra(c *gin.Context) map[string]any {
	val, exists := c.Get(renderAuthExtraKey)
	if !exists {
		return nil
	}
	extra, _ := val.(map[string]any)
	return extra
}
