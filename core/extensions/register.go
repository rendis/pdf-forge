package extensions

import (
	"github.com/rendis/pdf-forge/core/cmd/api/bootstrap"
	"github.com/rendis/pdf-forge/core/extensions/injectors"
)

// Register registers all user-defined extensions with the engine.
// This is the single entry point for all customizations.
func Register(engine *bootstrap.Engine) {
	// --- Injectors ---
	engine.RegisterInjector(&injectors.ExampleValueInjector{})
	engine.RegisterInjector(&injectors.ExampleNumberInjector{})
	engine.RegisterInjector(&injectors.ExampleBoolInjector{})
	engine.RegisterInjector(&injectors.ExampleTimeInjector{})
	engine.RegisterInjector(&injectors.ExampleImageInjector{})
	engine.RegisterInjector(&injectors.ExampleTableInjector{})
	engine.RegisterInjector(&injectors.ExampleListInjector{})

	// --- Request Mapper ---
	engine.SetMapper(&ExampleMapper{})

	// --- Init Function ---
	engine.SetInitFunc(ExampleInit())

	// --- Workspace Injectable Provider ---
	engine.SetWorkspaceInjectableProvider(&ExampleWorkspaceProvider{})

	// --- Render Authenticator ---
	engine.SetRenderAuthenticator(&ExampleRenderAuth{})

	// --- Global Middleware ---
	engine.UseMiddleware(RequestLoggerMiddleware())
	engine.UseMiddleware(CustomHeadersMiddleware())

	// --- API Middleware ---
	engine.UseAPIMiddleware(TenantValidationMiddleware())
}
