package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// AuthClient is an HTTP client for Tether authentication API.
type AuthClient struct {
	baseURL string
	http    *http.Client
}

// NewAuthClient creates a new auth client.
func NewAuthClient(baseURL string) *AuthClient {
	return &AuthClient{
		baseURL: baseURL,
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// verifyRequest is the request body for token verification.
type verifyRequest struct {
	Key string `json:"key"`
}

// VerifyToken verifies a JWT token against the Tether authentication API.
func (c *AuthClient) VerifyToken(ctx context.Context, token string) error {
	url := c.baseURL + "/users-v2/authentication/verify"

	body, err := json.Marshal(verifyRequest{Key: token})
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("token verification failed (status %d): %s", resp.StatusCode, string(respBody))
}
