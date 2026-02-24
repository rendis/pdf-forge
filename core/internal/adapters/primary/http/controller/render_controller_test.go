package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
)

func TestParseRenderEnvironment(t *testing.T) {
	t.Run("dev returns EnvironmentDev", func(t *testing.T) {
		env, err := parseRenderEnvironment("dev")
		require.NoError(t, err)
		assert.Equal(t, entity.EnvironmentDev, env)
	})

	t.Run("DEV case insensitive", func(t *testing.T) {
		env, err := parseRenderEnvironment("DEV")
		require.NoError(t, err)
		assert.Equal(t, entity.EnvironmentDev, env)
	})

	t.Run("Dev mixed case", func(t *testing.T) {
		env, err := parseRenderEnvironment("Dev")
		require.NoError(t, err)
		assert.Equal(t, entity.EnvironmentDev, env)
	})

	t.Run("dev with whitespace trimmed", func(t *testing.T) {
		env, err := parseRenderEnvironment("  dev  ")
		require.NoError(t, err)
		assert.Equal(t, entity.EnvironmentDev, env)
	})

	t.Run("prod returns EnvironmentProd", func(t *testing.T) {
		env, err := parseRenderEnvironment("prod")
		require.NoError(t, err)
		assert.Equal(t, entity.EnvironmentProd, env)
	})

	t.Run("PROD case insensitive", func(t *testing.T) {
		env, err := parseRenderEnvironment("PROD")
		require.NoError(t, err)
		assert.Equal(t, entity.EnvironmentProd, env)
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
