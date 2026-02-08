package factory

import (
	"github.com/rendis/pdf-forge/extensions/tether/datasource"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/mongodb"
)

// DynamicInjectorRepoFactory provides environment-aware access to DynamicInjectorRepository.
type DynamicInjectorRepoFactory struct {
	dev  *mongodb.DynamicInjectorRepository
	prod *mongodb.DynamicInjectorRepository
}

// NewDynamicInjectorRepoFactory creates a new factory with dev and prod repositories.
func NewDynamicInjectorRepoFactory(dev, prod *mongodb.DynamicInjectorRepository) *DynamicInjectorRepoFactory {
	return &DynamicInjectorRepoFactory{dev: dev, prod: prod}
}

// Get returns the repository for the given environment.
func (f *DynamicInjectorRepoFactory) Get(env datasource.Environment) *mongodb.DynamicInjectorRepository {
	if env.IsProd() {
		return f.prod
	}
	return f.dev
}
