package entity

// Environment represents the render environment from the X-Environment header.
type Environment string

const (
	// EnvironmentDev is the development/staging environment.
	EnvironmentDev Environment = "dev"
	// EnvironmentProd is the production environment.
	EnvironmentProd Environment = "prod"
)

// IsDev returns true if the environment is dev.
func (e Environment) IsDev() bool { return e == EnvironmentDev }

// IsProd returns true if the environment is prod.
func (e Environment) IsProd() bool { return e == EnvironmentProd }
