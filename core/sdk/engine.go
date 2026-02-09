package sdk

import "github.com/rendis/pdf-forge/cmd/api/bootstrap"

// Engine is the main entry point for pdf-forge.
// Create with New(), register extensions, then call Run().
type Engine = bootstrap.Engine

// New creates a new Engine with default configuration.
var New = bootstrap.New

// NewWithConfig creates a new Engine that loads config from the given file path.
var NewWithConfig = bootstrap.NewWithConfig
