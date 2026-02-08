package shared

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
)

// JWTClaims represents relevant claims from a Tether JWT.
type JWTClaims struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	Username string `json:"username"`
}

// DecodeJWTClaims decodes JWT payload without signature validation.
// The token is assumed to be already validated by the auth middleware.
func DecodeJWTClaims(token string) (*JWTClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid JWT format")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errors.New("failed to decode JWT payload")
	}

	var claims JWTClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, errors.New("failed to parse JWT claims")
	}

	if claims.UserID == "" {
		if claims.Email != "" {
			claims.UserID = claims.Email
		} else if claims.Username != "" {
			claims.UserID = claims.Username
		} else {
			return nil, errors.New("no user identifier in token")
		}
	}

	return &claims, nil
}

// ExtractBearerToken extracts the token from an "Authorization: Bearer <token>" header value.
func ExtractBearerToken(authHeader string) (string, error) {
	if authHeader == "" {
		return "", errors.New("missing authorization header")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", errors.New("invalid authorization header format")
	}

	return parts[1], nil
}
