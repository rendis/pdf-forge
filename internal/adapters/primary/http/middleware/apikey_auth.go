package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/internal/core/entity"
)

// APIKeyHeader is the HTTP header name for API key authentication.
const APIKeyHeader = "X-API-Key" //nolint:gosec // This is a header name, not a credential

// APIKeyAuth creates a middleware that validates API key for internal service-to-service communication.
// Uses constant-time comparison to prevent timing attacks.
func APIKeyAuth(expectedKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader(APIKeyHeader)
		if apiKey == "" {
			abortWithError(c, http.StatusUnauthorized, entity.ErrMissingAPIKey)
			return
		}

		// Constant-time comparison to prevent timing attacks
		if subtle.ConstantTimeCompare([]byte(apiKey), []byte(expectedKey)) != 1 {
			abortWithError(c, http.StatusUnauthorized, entity.ErrInvalidAPIKey)
			return
		}

		c.Next()
	}
}
