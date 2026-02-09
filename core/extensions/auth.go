package extensions

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// ExampleRenderAuth implements port.RenderAuthenticator.
// Replace this with your own authentication logic (e.g., API key validation, JWT verification).
type ExampleRenderAuth struct{}

// Authenticate extracts the Bearer token from the Authorization header and returns example claims.
func (a *ExampleRenderAuth) Authenticate(c *gin.Context) (*port.RenderAuthClaims, error) {
	token, err := extractBearerToken(c.GetHeader("Authorization"))
	if err != nil {
		return nil, err
	}

	// TODO: Replace with your own token verification logic.
	_ = token

	return &port.RenderAuthClaims{
		UserID:   "example-user",
		Provider: "example",
	}, nil
}

// extractBearerToken extracts the token from a "Bearer <token>" header value.
func extractBearerToken(header string) (string, error) {
	if header == "" {
		return "", errors.New("missing Authorization header")
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return "", errors.New("invalid Authorization header format")
	}
	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", errors.New("empty bearer token")
	}
	return token, nil
}
