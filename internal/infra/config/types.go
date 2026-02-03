package config

import "time"

// Config represents the complete application configuration.
type Config struct {
	Environment string            `mapstructure:"environment"`
	Server      ServerConfig      `mapstructure:"server"`
	Database    DatabaseConfig    `mapstructure:"database"`
	Auth        AuthConfig        `mapstructure:"auth"`
	InternalAPI InternalAPIConfig `mapstructure:"internal_api"`
	Logging LoggingConfig `mapstructure:"logging"`
	Typst       TypstConfig       `mapstructure:"typst"`

	// DummyAuth is set at runtime when no auth config is provided.
	// Not loaded from YAML.
	DummyAuth bool `mapstructure:"-"`

	// DummyAuthUserID is the internal DB user ID for dummy auth mode.
	// Set at runtime after seeding the dummy user.
	DummyAuthUserID string `mapstructure:"-"`

	// DevFrontendURL is the URL of the frontend dev server (e.g., http://localhost:5173).
	// When set, the backend proxies non-API requests to this URL instead of serving embedded files.
	DevFrontendURL string `mapstructure:"-"`
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

// AuthConfig holds JWT/JWKS authentication configuration.
type AuthConfig struct {
	JWKSURL  string `mapstructure:"jwks_url"`
	Issuer   string `mapstructure:"issuer"`
	Audience string `mapstructure:"audience"`
}

// InternalAPIConfig holds configuration for internal service-to-service API.
type InternalAPIConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	APIKey  string `mapstructure:"api_key"`
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
