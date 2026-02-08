package factory

import (
	"github.com/rendis/pdf-forge/extensions/tether/datasource"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/mongodb"
)

// ApplicationRepoFactory provides environment-aware access to ApplicationRepository.
type ApplicationRepoFactory struct {
	dev  *mongodb.ApplicationRepository
	prod *mongodb.ApplicationRepository
}

// NewApplicationRepoFactory creates a new factory with dev and prod repositories.
func NewApplicationRepoFactory(dev, prod *mongodb.ApplicationRepository) *ApplicationRepoFactory {
	return &ApplicationRepoFactory{dev: dev, prod: prod}
}

// Get returns the repository for the given environment.
func (f *ApplicationRepoFactory) Get(env datasource.Environment) *mongodb.ApplicationRepository {
	if env.IsProd() {
		return f.prod
	}
	return f.dev
}
