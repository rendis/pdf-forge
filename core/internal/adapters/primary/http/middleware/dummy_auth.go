package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
)

const (
	// DummyUserID is the fixed external identity ID for dummy auth mode.
	DummyUserID = "00000000-0000-0000-0000-000000000001"
	// DummyUserEmail is the fixed email for dummy auth mode.
	DummyUserEmail = "admin@pdfforge.local"
	// DummyUserName is the fixed name for dummy auth mode.
	DummyUserName = "PDF Forge Admin"
)

// DummyAuth creates a middleware that bypasses JWT validation and injects
// a fixed superadmin identity. Used when no auth config is provided (dev mode).
func DummyAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Set JWT-level claims (normally set by JWTAuth)
		c.Set(userIDKey, DummyUserID)
		c.Set(userEmailKey, DummyUserEmail)
		c.Set(userNameKey, DummyUserName)

		c.Next()
	}
}

// DummyIdentityAndRoles creates a middleware that sets the internal user ID
// and grants SUPERADMIN system role. Used in dummy auth mode to bypass
// IdentityContext and SystemRoleContext middlewares.
//
// Set DOC_ENGINE_DUMMY_NO_SYSTEM_ROLE=true to skip system role assignment,
// allowing testing of tenant-owner flows where roles come from DB membership.
func DummyIdentityAndRoles(internalUserID string) gin.HandlerFunc {
	skipSystemRole := os.Getenv("DOC_ENGINE_DUMMY_NO_SYSTEM_ROLE") == "true"

	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		c.Set(internalUserIDKey, internalUserID)
		if !skipSystemRole {
			c.Set(systemRoleKey, entity.SystemRoleSuperAdmin)
		}

		c.Next()
	}
}
