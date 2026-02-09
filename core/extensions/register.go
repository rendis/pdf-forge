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
		mongoDevClient, mongoProdClient = connectMongo(ctx)
		initFactories(ctx, mongoDevClient, mongoProdClient)
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

// connectMongo creates dev and prod MongoDB clients, logging warnings on failure.
func connectMongo(ctx context.Context) (*mongodb.Client, *mongodb.Client) {
	devClient, err := mongodb.NewClient(ctx, os.Getenv("PDF_FORGE_MONGO_DEV_URI"), toolsDB)
	if err != nil {
		slog.WarnContext(ctx, "MongoDB dev not configured", slog.Any("error", err))
	}
	prodClient, err := mongodb.NewClient(ctx, os.Getenv("PDF_FORGE_MONGO_PROD_URI"), toolsDB)
	if err != nil {
		slog.WarnContext(ctx, "MongoDB prod not configured", slog.Any("error", err))
	}
	return devClient, prodClient
}

// initFactories sets up all data-source factories from the MongoDB clients.
func initFactories(ctx context.Context, dev, prod *mongodb.Client) {
	initDynamicInjectorFactory(ctx, dev, prod)
	initSurveyFactory(ctx, dev, prod)
	initApplicationFactory(ctx, dev, prod)
	initAuthFactory(ctx)
}

func initDynamicInjectorFactory(ctx context.Context, dev, prod *mongodb.Client) {
	var devRepo, prodRepo *mongodb.DynamicInjectorRepository
	if dev != nil {
		devRepo = mongodb.NewDynamicInjectorRepository(dev.Database().Collection(toolsCollDynamicInjectors))
	}
	if prod != nil {
		prodRepo = mongodb.NewDynamicInjectorRepository(prod.Database().Collection(toolsCollDynamicInjectors))
	}
	SetDynamicInjectorFactory(factory.NewDynamicInjectorRepoFactory(devRepo, prodRepo))
	slog.InfoContext(ctx, "dynamic injector factory initialized")
}

func initSurveyFactory(ctx context.Context, dev, prod *mongodb.Client) {
	var devRepo, prodRepo *mongodb.SurveyRepository
	if dev != nil {
		devRepo = mongodb.NewSurveyRepository(dev.Database().Collection(toolsCollSurveys))
	}
	if prod != nil {
		prodRepo = mongodb.NewSurveyRepository(prod.Database().Collection(toolsCollSurveys))
	}
	SetSurveyFactory(factory.NewSurveyRepoFactory(devRepo, prodRepo))
	slog.InfoContext(ctx, "survey factory initialized")
}

func initApplicationFactory(ctx context.Context, dev, prod *mongodb.Client) {
	var devRepo, prodRepo *mongodb.ApplicationRepository
	if dev != nil {
		devRepo = mongodb.NewApplicationRepository(dev.DatabaseByName(crmDB).Collection(crmCollApplications))
	}
	if prod != nil {
		prodRepo = mongodb.NewApplicationRepository(prod.DatabaseByName(crmDB).Collection(crmCollApplications))
	}
	SetApplicationFactory(factory.NewApplicationRepoFactory(devRepo, prodRepo))
	slog.InfoContext(ctx, "application factory initialized")
}

func initAuthFactory(ctx context.Context) {
	devAuthClient := api.NewAuthClient("https://staging.api.tether.education")
	prodAuthClient := api.NewAuthClient("https://api.tether.education")
	SetAuthFactory(factory.NewAuthClientFactory(devAuthClient, prodAuthClient))
	slog.InfoContext(ctx, "auth client factory initialized")
}
