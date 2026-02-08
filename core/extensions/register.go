package extensions

import (
	"context"
	"log/slog"
	"os"

	"github.com/rendis/pdf-forge/cmd/api/bootstrap"
	"github.com/rendis/pdf-forge/extensions/injectors"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/api"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/factory"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/mongodb"
)

const (
	toolsDB                   = "tools"
	crmDB                     = "crm"
	toolsCollDynamicInjectors = "pdf_forge_dynamic_injectors"
	toolsCollSurveys          = "surveys"
	crmCollApplications       = "applications"
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
	engine.SetMapper(&TetherMapper{})

	// --- Init Function ---
	engine.SetInitFunc(TetherInit())

	// --- Workspace Injectable Provider ---
	engine.SetWorkspaceInjectableProvider(&DynamicWorkspaceProvider{})

	// --- Render Authenticator ---
	engine.SetRenderAuthenticator(&TetherRenderAuth{})

	// --- Global Middleware ---
	engine.UseMiddleware(RequestLoggerMiddleware())
	engine.UseMiddleware(CustomHeadersMiddleware())

	// --- API Middleware ---
	engine.UseAPIMiddleware(TenantValidationMiddleware())

	// --- Lifecycle Hooks ---
	registerLifecycle(engine)
}

// registerLifecycle registers startup and shutdown hooks.
func registerLifecycle(engine *bootstrap.Engine) {
	var mongoDevClient, mongoProdClient *mongodb.Client

	engine.OnStart(func(ctx context.Context) error {
		slog.InfoContext(ctx, "running OnStart hook")

		var err error
		mongoDevClient, err = mongodb.NewClient(ctx, os.Getenv("PDF_FORGE_MONGO_DEV_URI"), toolsDB)
		if err != nil {
			slog.WarnContext(ctx, "MongoDB dev not configured", slog.Any("error", err))
		}

		mongoProdClient, err = mongodb.NewClient(ctx, os.Getenv("PDF_FORGE_MONGO_PROD_URI"), toolsDB)
		if err != nil {
			slog.WarnContext(ctx, "MongoDB prod not configured", slog.Any("error", err))
		}

		var devRepo, prodRepo *mongodb.DynamicInjectorRepository
		if mongoDevClient != nil {
			devRepo = mongodb.NewDynamicInjectorRepository(mongoDevClient.Database().Collection(toolsCollDynamicInjectors))
		}
		if mongoProdClient != nil {
			prodRepo = mongodb.NewDynamicInjectorRepository(mongoProdClient.Database().Collection(toolsCollDynamicInjectors))
		}

		SetDynamicInjectorFactory(factory.NewDynamicInjectorRepoFactory(devRepo, prodRepo))
		slog.InfoContext(ctx, "dynamic injector factory initialized")

		// Survey repositories (tools DB — reuse existing clients)
		var devSurveyRepo, prodSurveyRepo *mongodb.SurveyRepository
		if mongoDevClient != nil {
			devSurveyRepo = mongodb.NewSurveyRepository(mongoDevClient.Database().Collection(toolsCollSurveys))
		}
		if mongoProdClient != nil {
			prodSurveyRepo = mongodb.NewSurveyRepository(mongoProdClient.Database().Collection(toolsCollSurveys))
		}
		SetSurveyFactory(factory.NewSurveyRepoFactory(devSurveyRepo, prodSurveyRepo))
		slog.InfoContext(ctx, "survey factory initialized")

		// Application repositories (crm DB — reuse connection, different database)
		var devAppRepo, prodAppRepo *mongodb.ApplicationRepository
		if mongoDevClient != nil {
			devAppRepo = mongodb.NewApplicationRepository(mongoDevClient.DatabaseByName(crmDB).Collection(crmCollApplications))
		}
		if mongoProdClient != nil {
			prodAppRepo = mongodb.NewApplicationRepository(mongoProdClient.DatabaseByName(crmDB).Collection(crmCollApplications))
		}
		SetApplicationFactory(factory.NewApplicationRepoFactory(devAppRepo, prodAppRepo))
		slog.InfoContext(ctx, "application factory initialized")

		// Initialize auth client factory for render authentication
		devAuthClient := api.NewAuthClient("https://staging.api.tether.education")
		prodAuthClient := api.NewAuthClient("https://api.tether.education")
		SetAuthFactory(factory.NewAuthClientFactory(devAuthClient, prodAuthClient))
		slog.InfoContext(ctx, "auth client factory initialized")

		return nil
	})

	engine.OnShutdown(func(ctx context.Context) error {
		slog.InfoContext(ctx, "running OnShutdown hook")

		if mongoDevClient != nil {
			mongoDevClient.Close(ctx)
		}
		if mongoProdClient != nil {
			mongoProdClient.Close(ctx)
		}

		return nil
	})
}
