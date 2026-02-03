package sdk

import (
	"github.com/rendis/pdf-forge/internal/infra/config"
)

// Option configures the Engine.
type Option func(*Engine)

// WithConfigFile loads configuration from a YAML file.
// Environment variables with DOC_ENGINE_ prefix override YAML values.
func WithConfigFile(path string) Option {
	return func(e *Engine) {
		e.configFilePath = path
	}
}

// WithConfig provides configuration programmatically.
// Takes precedence over WithConfigFile if both are set.
func WithConfig(cfg *config.Config) Option {
	return func(e *Engine) {
		e.config = cfg
	}
}

// WithI18nFile loads injector translations from a YAML file.
func WithI18nFile(path string) Option {
	return func(e *Engine) {
		e.i18nFilePath = path
	}
}

// WithDevFrontendURL sets a development frontend URL.
// When set, the engine proxies requests to this URL instead of serving embedded assets.
// Use this during frontend development for hot-reload support.
func WithDevFrontendURL(url string) Option {
	return func(e *Engine) {
		e.devFrontendURL = url
	}
}
