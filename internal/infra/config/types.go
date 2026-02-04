package config

import "time"

// Config represents the complete application configuration.
type Config struct {
	Environment   string         `mapstructure:"environment"`
	Server        ServerConfig   `mapstructure:"server"`
	Database      DatabaseConfig `mapstructure:"database"`
	Auth          *AuthConfig    `mapstructure:"auth"`            // New: grouped auth config (panel + render providers)
	OIDCProviders []OIDCProvider `mapstructure:"oidc_providers"` // Legacy: kept for backward compatibility
	Logging       LoggingConfig  `mapstructure:"logging"`
	Typst         TypstConfig    `mapstructure:"typst"`

	// DummyAuth is set at runtime when no OIDC providers are configured.
	// Not loaded from YAML.
	DummyAuth bool `mapstructure:"-"`

	// DummyAuthUserID is the internal DB user ID for dummy auth mode.
	// Set at runtime after seeding the dummy user.
	DummyAuthUserID string `mapstructure:"-"`

	// DevFrontendURL is the URL of the frontend dev server (e.g., http://localhost:5173).
	// When set, the backend proxies non-API requests to this URL instead of serving embedded files.
	DevFrontendURL string `mapstructure:"-"`
}

// AuthConfig groups authentication configuration.
// Separates panel (login/UI) auth from render-only providers.
type AuthConfig struct {
	// Panel is the OIDC provider for web panel login and all non-render routes.
	Panel *OIDCProvider `mapstructure:"panel"`
	// RenderProviders are additional OIDC providers accepted ONLY for render endpoints.
	// Panel provider is always valid for render too (allows UI preview).
	RenderProviders []OIDCProvider `mapstructure:"render_providers"`
}

// GetOIDCProviders returns the list of configured OIDC providers.
// Deprecated: Use GetPanelOIDC() and GetRenderOIDCProviders() instead.
func (c *Config) GetOIDCProviders() []OIDCProvider {
	return c.OIDCProviders
}

// GetPanelOIDC returns the OIDC provider for panel (login/UI) authentication.
// Falls back to first legacy oidc_provider if auth.panel is not configured.
func (c *Config) GetPanelOIDC() *OIDCProvider {
	// New format: auth.panel
	if c.Auth != nil && c.Auth.Panel != nil {
		return c.Auth.Panel
	}
	// Legacy fallback: first provider from oidc_providers
	if len(c.OIDCProviders) > 0 {
		return &c.OIDCProviders[0]
	}
	return nil
}

// GetRenderOIDCProviders returns all OIDC providers valid for render endpoints.
// Always includes panel provider (if exists) plus any render-specific providers.
func (c *Config) GetRenderOIDCProviders() []OIDCProvider {
	// Legacy fallback: all oidc_providers work for render
	if c.Auth == nil {
		return c.OIDCProviders
	}

	panel := c.GetPanelOIDC()
	renderProviders := c.Auth.RenderProviders

	// No panel and no render providers
	if panel == nil && len(renderProviders) == 0 {
		return c.OIDCProviders
	}

	// Build result: panel (if exists) + render providers
	result := make([]OIDCProvider, 0, len(renderProviders)+1)
	if panel != nil {
		result = append(result, *panel)
	}
	result = append(result, renderProviders...)
	return result
}

// IsDummyAuth returns true if no OIDC providers are configured.
func (c *Config) IsDummyAuth() bool {
	return c.GetPanelOIDC() == nil
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Port            string `mapstructure:"port"`
	ReadTimeout     int    `mapstructure:"read_timeout"`
	WriteTimeout    int    `mapstructure:"write_timeout"`
	ShutdownTimeout int    `mapstructure:"shutdown_timeout"`
	SwaggerUI       bool   `mapstructure:"swagger_ui"`
}

// ReadTimeoutDuration returns the read timeout as time.Duration.
func (s ServerConfig) ReadTimeoutDuration() time.Duration {
	return time.Duration(s.ReadTimeout) * time.Second
}

// WriteTimeoutDuration returns the write timeout as time.Duration.
func (s ServerConfig) WriteTimeoutDuration() time.Duration {
	return time.Duration(s.WriteTimeout) * time.Second
}

// ShutdownTimeoutDuration returns the shutdown timeout as time.Duration.
func (s ServerConfig) ShutdownTimeoutDuration() time.Duration {
	return time.Duration(s.ShutdownTimeout) * time.Second
}

// DatabaseConfig holds PostgreSQL connection configuration.
type DatabaseConfig struct {
	Host               string `mapstructure:"host"`
	Port               int    `mapstructure:"port"`
	User               string `mapstructure:"user"`
	Password           string `mapstructure:"password"`
	Name               string `mapstructure:"name"`
	SSLMode            string `mapstructure:"ssl_mode"`
	MaxPoolSize        int    `mapstructure:"max_pool_size"`
	MinPoolSize        int    `mapstructure:"min_pool_size"`
	MaxIdleTimeSeconds int    `mapstructure:"max_idle_time_seconds"`
}

// MaxIdleTimeDuration returns the max idle time as time.Duration.
func (d DatabaseConfig) MaxIdleTimeDuration() time.Duration {
	return time.Duration(d.MaxIdleTimeSeconds) * time.Second
}

// OIDCProvider represents a single OIDC identity provider configuration.
type OIDCProvider struct {
	Name     string `mapstructure:"name"`     // Human-readable name for logging
	Issuer   string `mapstructure:"issuer"`   // Expected token issuer (iss claim)
	JWKSURL  string `mapstructure:"jwks_url"` // JWKS endpoint URL
	Audience string `mapstructure:"audience"` // Optional audience (aud claim)
}

// LoggingConfig holds logging configuration.
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

// TypstConfig holds Typst renderer configuration.
type TypstConfig struct {
	BinPath                  string   `mapstructure:"bin_path"`
	TimeoutSeconds           int      `mapstructure:"timeout_seconds"`
	FontDirs                 []string `mapstructure:"font_dirs"`
	MaxConcurrent            int      `mapstructure:"max_concurrent"`
	AcquireTimeoutSeconds    int      `mapstructure:"acquire_timeout_seconds"`
	TemplateCacheTTL         int      `mapstructure:"template_cache_ttl_seconds"`
	TemplateCacheMax         int      `mapstructure:"template_cache_max_entries"`
	ImageCacheDir            string   `mapstructure:"image_cache_dir"`
	ImageCacheMaxAgeSeconds  int      `mapstructure:"image_cache_max_age_seconds"`
	ImageCacheCleanupSeconds int      `mapstructure:"image_cache_cleanup_interval_seconds"`
}

// TimeoutDuration returns the timeout as time.Duration.
func (t TypstConfig) TimeoutDuration() time.Duration {
	return time.Duration(t.TimeoutSeconds) * time.Second
}

// AcquireTimeoutDuration returns the acquire timeout as time.Duration.
func (t TypstConfig) AcquireTimeoutDuration() time.Duration {
	return time.Duration(t.AcquireTimeoutSeconds) * time.Second
}
