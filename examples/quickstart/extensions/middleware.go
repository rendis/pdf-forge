package extensions

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

// RequestLoggerMiddleware logs request latency and status.
// Apply globally with engine.UseMiddleware().
func RequestLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		slog.InfoContext(c.Request.Context(), "http request",
			slog.String("method", method),
			slog.String("path", path),
			slog.Int("status", c.Writer.Status()),
			slog.Duration("latency", time.Since(start)),
			slog.String("client_ip", c.ClientIP()))
	}
}

// CustomHeadersMiddleware adds custom response headers.
// Apply globally with engine.UseMiddleware().
func CustomHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Powered-By", "pdf-forge")
		c.Next()
	}
}

// TenantValidationMiddleware validates tenant header presence.
// Apply to API routes with engine.UseAPIMiddleware().
func TenantValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip validation for non-workspace routes
		// This is just an example; real validation depends on your use case
		tenantID := c.GetHeader("X-Tenant-ID")
		if tenantID == "" {
			// You could enforce tenant presence here
			// c.AbortWithStatusJSON(400, gin.H{"error": "X-Tenant-ID header required"})
			// return
		}
		c.Next()
	}
}

// RateLimitMiddleware is a placeholder for rate limiting logic.
// Apply to API routes with engine.UseAPIMiddleware().
func RateLimitMiddleware(requestsPerSecond int) gin.HandlerFunc {
	// In production, use a proper rate limiter like golang.org/x/time/rate
	return func(c *gin.Context) {
		// Rate limit logic here
		c.Next()
	}
}
