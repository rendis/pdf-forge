package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseRenderEnvironment(t *testing.T) {
	t.Run("dev returns staging mode true", func(t *testing.T) {
		staging, err := parseRenderEnvironment("dev")
		require.NoError(t, err)
		assert.True(t, staging)
	})

	t.Run("DEV case insensitive", func(t *testing.T) {
		staging, err := parseRenderEnvironment("DEV")
		require.NoError(t, err)
		assert.True(t, staging)
	})

	t.Run("Dev mixed case", func(t *testing.T) {
		staging, err := parseRenderEnvironment("Dev")
		require.NoError(t, err)
		assert.True(t, staging)
	})

	t.Run("dev with whitespace trimmed", func(t *testing.T) {
		staging, err := parseRenderEnvironment("  dev  ")
		require.NoError(t, err)
		assert.True(t, staging)
	})

	t.Run("prod returns staging mode false", func(t *testing.T) {
		staging, err := parseRenderEnvironment("prod")
		require.NoError(t, err)
		assert.False(t, staging)
	})

	t.Run("PROD case insensitive", func(t *testing.T) {
		staging, err := parseRenderEnvironment("PROD")
		require.NoError(t, err)
		assert.False(t, staging)
	})

	t.Run("empty string returns error", func(t *testing.T) {
		_, err := parseRenderEnvironment("")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "X-Environment header is required")
	})

	t.Run("whitespace only returns error", func(t *testing.T) {
		_, err := parseRenderEnvironment("   ")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "X-Environment header is required")
	})

	t.Run("invalid value returns error", func(t *testing.T) {
		_, err := parseRenderEnvironment("staging")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid X-Environment value")
		assert.Contains(t, err.Error(), "staging")
	})

	t.Run("true is not valid", func(t *testing.T) {
		_, err := parseRenderEnvironment("true")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid X-Environment value")
	})
}
