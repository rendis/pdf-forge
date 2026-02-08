package extensions

import (
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/rendis/pdf-forge/extensions/tether/datasource"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/factory"
	"github.com/rendis/pdf-forge/extensions/tether/shared"
	"github.com/rendis/pdf-forge/internal/core/port"
)

var authFactory *factory.AuthClientFactory

// SetAuthFactory sets the auth client factory for render authentication.
// Must be called in OnStart before the server starts.
func SetAuthFactory(f *factory.AuthClientFactory) {
	authFactory = f
}

// TetherRenderAuth implements port.RenderAuthenticator for Tether API token verification.
type TetherRenderAuth struct{}

// Authenticate validates the Bearer token against Tether API.
func (a *TetherRenderAuth) Authenticate(c *gin.Context) (*port.RenderAuthClaims, error) {
	ctx := c.Request.Context()

	// 1. Extract Bearer token
	token, err := shared.ExtractBearerToken(c.GetHeader("Authorization"))
	if err != nil {
		return nil, err
	}

	// 2. Decode JWT claims (fail-fast for malformed tokens)
	claims, err := shared.DecodeJWTClaims(token)
	if err != nil {
		slog.WarnContext(ctx, "failed to decode token claims",
			slog.String("error", err.Error()),
		)
		return nil, errors.New("invalid token format")
	}

	// 3. Determine environment from header
	envStr := c.GetHeader("x-environment")
	env := datasource.ParseEnv(envStr)

	// 4. Verify token with Tether API
	if authFactory == nil {
		slog.ErrorContext(ctx, "auth factory not initialized")
		return nil, errors.New("authentication not configured")
	}

	authClient := authFactory.Get(env)
	if err := authClient.VerifyToken(ctx, token); err != nil {
		slog.WarnContext(ctx, "token verification failed",
			slog.String("error", err.Error()),
			slog.String("environment", env.String()),
		)
		return nil, errors.New("invalid token")
	}

	slog.InfoContext(ctx, "render auth successful",
		slog.String("user_id", claims.UserID),
		slog.String("email", claims.Email),
		slog.String("environment", env.String()),
	)

	return &port.RenderAuthClaims{
		UserID:   claims.UserID,
		Email:    claims.Email,
		Provider: "tether-api",
		Extra: map[string]any{
			"environment": env.String(),
		},
	}, nil
}
