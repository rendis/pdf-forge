package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

// Load reads configuration from YAML files and environment variables.
// Environment variables take precedence over YAML values.
// Env prefix: DOC_ENGINE_ (e.g., DOC_ENGINE_SERVER_PORT)
func Load() (*Config, error) {
	v := viper.New()

	// Set config file settings
	v.SetConfigName("app")
	v.SetConfigType("yaml")

	// Add config paths (searched in order)
	v.AddConfigPath("./settings")
	v.AddConfigPath("../settings")
	v.AddConfigPath("../../settings")
	v.AddConfigPath(".")

	// Environment variable settings
	v.SetEnvPrefix("DOC_ENGINE")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Read config file
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("reading config file: %w", err)
		}
		// Config file not found is acceptable, we'll use env vars and defaults
	}

	// Bind env vars and set defaults
	bindEnvVars(v)
	setDefaults(v)

	// Unmarshal into struct
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config: %w", err)
	}

	// Special handling for PORT env var (common in container environments)
	if cfg.Server.Port == "" {
		if port := os.Getenv("PORT"); port != "" {
			cfg.Server.Port = port
		}
	}

	return &cfg, nil
}

// bindEnvVars explicitly binds environment variables to config keys.
// Required because Viper's AutomaticEnv doesn't work reliably with Unmarshal.
func bindEnvVars(v *viper.Viper) {
	// Database
	v.BindEnv("database.host")
	v.BindEnv("database.port")
	v.BindEnv("database.user")
	v.BindEnv("database.password")
	v.BindEnv("database.name")
	v.BindEnv("database.ssl_mode")
	v.BindEnv("database.max_pool_size")
	v.BindEnv("database.min_pool_size")
	v.BindEnv("database.max_idle_time_seconds")
	// Server
	v.BindEnv("server.port")
	v.BindEnv("server.read_timeout")
	v.BindEnv("server.write_timeout")
	v.BindEnv("server.shutdown_timeout")
	v.BindEnv("server.swagger_ui")
	// Auth
	v.BindEnv("auth.jwks_url")
	v.BindEnv("auth.issuer")
	v.BindEnv("auth.audience")
	// InternalAPI
	v.BindEnv("internal_api.enabled")
	v.BindEnv("internal_api.api_key")
	// Logging
	v.BindEnv("logging.level")
	v.BindEnv("logging.format")
	// Typst
	v.BindEnv("typst.bin_path")
	v.BindEnv("typst.timeout_seconds")
	v.BindEnv("typst.max_concurrent")
	v.BindEnv("typst.acquire_timeout_seconds")
	// Environment
	v.BindEnv("environment")
}

// setDefaults sets default configuration values.
func setDefaults(v *viper.Viper) {
	// Server defaults
	v.SetDefault("server.port", "8080")
	v.SetDefault("server.read_timeout", 30)
	v.SetDefault("server.write_timeout", 30)
	v.SetDefault("server.shutdown_timeout", 10)
	v.SetDefault("server.swagger_ui", false)

	// Database defaults
	v.SetDefault("database.host", "localhost")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.user", "postgres")
	v.SetDefault("database.name", "doc_engine")
	v.SetDefault("database.ssl_mode", "disable")
	v.SetDefault("database.max_pool_size", 10)
	v.SetDefault("database.min_pool_size", 2)
	v.SetDefault("database.max_idle_time_seconds", 300)

	// Logging defaults
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "json")

	// Typst defaults
	v.SetDefault("typst.bin_path", "typst")
	v.SetDefault("typst.timeout_seconds", 10)

	// Environment default
	v.SetDefault("environment", "development")
}

// LoadFromFile loads configuration from a specific YAML file path.
// Environment variables still override YAML values.
func LoadFromFile(filePath string) (*Config, error) {
	v := viper.New()

	v.SetConfigFile(filePath)

	// Environment variable settings
	v.SetEnvPrefix("DOC_ENGINE")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("reading config file %s: %w", filePath, err)
	}

	bindEnvVars(v)
	setDefaults(v)

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config: %w", err)
	}

	if cfg.Server.Port == "" {
		if port := os.Getenv("PORT"); port != "" {
			cfg.Server.Port = port
		}
	}

	return &cfg, nil
}

// MustLoad loads configuration and panics on error.
// Use this only in main() or initialization code.
func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}
	return cfg
}
