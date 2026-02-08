package factory

import (
	"github.com/rendis/pdf-forge/extensions/tether/datasource"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/api"
)

// AuthClientFactory provides environment-aware access to AuthClient.
type AuthClientFactory struct {
	dev  *api.AuthClient
	prod *api.AuthClient
}

// NewAuthClientFactory creates a new factory with dev and prod auth clients.
func NewAuthClientFactory(dev, prod *api.AuthClient) *AuthClientFactory {
	return &AuthClientFactory{dev: dev, prod: prod}
}

// Get returns the auth client for the given environment.
func (f *AuthClientFactory) Get(env datasource.Environment) *api.AuthClient {
	if env.IsProd() {
		return f.prod
	}
	return f.dev
}
