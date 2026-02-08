package datasource

import "strings"

// Environment represents the deployment environment.
type Environment string

const (
	EnvDev  Environment = "dev"
	EnvProd Environment = "prod"
)

// ParseEnv parses a string to Environment, defaults to dev.
func ParseEnv(s string) Environment {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "prod", "production":
		return EnvProd
	default:
		return EnvDev
	}
}

// IsDev returns true if environment is development.
func (e Environment) IsDev() bool {
	return e == EnvDev
}

// IsProd returns true if environment is production.
func (e Environment) IsProd() bool {
	return e == EnvProd
}

// String returns the string representation.
func (e Environment) String() string {
	return string(e)
}
