package middleware

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
)

// RequestTimeout returns a middleware that wraps the request context with a deadline.
// This ensures that all downstream operations (DB queries, external calls) respect the timeout
// and prevents goroutine leaks when the HTTP WriteTimeout closes the connection.
func RequestTimeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}
