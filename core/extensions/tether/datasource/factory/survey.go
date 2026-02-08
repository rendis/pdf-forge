package factory

import (
	"github.com/rendis/pdf-forge/extensions/tether/datasource"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/mongodb"
)

// SurveyRepoFactory provides environment-aware access to SurveyRepository.
type SurveyRepoFactory struct {
	dev  *mongodb.SurveyRepository
	prod *mongodb.SurveyRepository
}

// NewSurveyRepoFactory creates a new factory with dev and prod repositories.
func NewSurveyRepoFactory(dev, prod *mongodb.SurveyRepository) *SurveyRepoFactory {
	return &SurveyRepoFactory{dev: dev, prod: prod}
}

// Get returns the repository for the given environment.
func (f *SurveyRepoFactory) Get(env datasource.Environment) *mongodb.SurveyRepository {
	if env.IsProd() {
		return f.prod
	}
	return f.dev
}
