package bootstrap

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rendis/pdf-forge/internal/adapters/primary/http/controller"
	httpmapper "github.com/rendis/pdf-forge/internal/adapters/primary/http/mapper"
	"github.com/rendis/pdf-forge/internal/adapters/primary/http/middleware"
	"github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres"
	documenttyperepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/document_type_repo"
	folderrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/folder_repo"
	injectablerepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/injectable_repo"
	systeminjectablerepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/system_injectable_repo"
	systemrolerepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/system_role_repo"
	tagrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/tag_repo"
	templaterepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/template_repo"
	templatetagrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/template_tag_repo"
	templateversioninjectablerepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/template_version_injectable_repo"
	templateversionrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/template_version_repo"
	tenantmemberrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/tenant_member_repo"
	tenantrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/tenant_repo"
	useraccesshistoryrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/user_access_history_repo"
	userrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/user_repo"
	workspaceinjectablerepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/workspace_injectable_repo"
	workspacememberrepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/workspace_member_repo"
	workspacerepo "github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/workspace_repo"
	accesssvc "github.com/rendis/pdf-forge/internal/core/service/access"
	catalogsvc "github.com/rendis/pdf-forge/internal/core/service/catalog"
	injectablesvc "github.com/rendis/pdf-forge/internal/core/service/injectable"
	organizationsvc "github.com/rendis/pdf-forge/internal/core/service/organization"
	"github.com/rendis/pdf-forge/internal/core/service/rendering/pdfrenderer"
	templatesvc "github.com/rendis/pdf-forge/internal/core/service/template"
	"github.com/rendis/pdf-forge/internal/core/service/template/contentvalidator"
	"github.com/rendis/pdf-forge/internal/extensions/injectors/datetime"
	"github.com/rendis/pdf-forge/internal/infra/config"
	"github.com/rendis/pdf-forge/internal/infra/registry"
	"github.com/rendis/pdf-forge/internal/infra/server"

	"github.com/rendis/pdf-forge/internal/core/port"
)

// appComponents holds all initialized components.
type appComponents struct {
	httpServer *server.HTTPServer
	dbPool     *pgxpool.Pool
}

func (a *appComponents) cleanup() {
	slog.Info("cleaning up resources")
	postgres.Close(a.dbPool)
	slog.Info("cleanup complete")
}

// initialize creates all components using manual DI.
func (e *Engine) initialize(ctx context.Context) (*appComponents, error) {
	cfg := e.config

	// --- Database ---
	pool, err := postgres.NewPool(ctx, &cfg.Database)
	if err != nil {
		return nil, err
	}

	// --- Repositories ---
	userRepo := userrepo.New(pool)
	systemRoleRepo := systemrolerepo.New(pool)
	workspaceRepo := workspacerepo.New(pool)
	workspaceMemberRepo := workspacememberrepo.New(pool)
	tenantMemberRepo := tenantmemberrepo.New(pool)
	tenantRepo := tenantrepo.New(pool)
	userAccessHistoryRepo := useraccesshistoryrepo.New(pool)
	folderRepo := folderrepo.New(pool)
	tagRepo := tagrepo.New(pool)
	injectableRepo := injectablerepo.New(pool)
	systemInjectableRepo := systeminjectablerepo.New(pool)
	workspaceInjectableRepo := workspaceinjectablerepo.New(pool)
	templateRepo := templaterepo.New(pool)
	templateVersionRepo := templateversionrepo.New(pool)
	templateTagRepo := templatetagrepo.New(pool)
	templateVersionInjectableRepo := templateversioninjectablerepo.New(pool)
	documentTypeRepo := documenttyperepo.New(pool)

	// --- Dummy Auth: seed default user ---
	if cfg.DummyAuth {
		userID, err := seedDummyUser(ctx, pool)
		if err != nil {
			return nil, err
		}
		cfg.DummyAuthUserID = userID
		slog.InfoContext(ctx, "dummy auth user seeded", slog.String("user_id", userID))
	}

	// --- Middleware ---
	middlewareProvider := middleware.NewProvider(
		pool,
		cfg.Bootstrap.Enabled,
		userRepo, systemRoleRepo, workspaceRepo, workspaceMemberRepo, tenantMemberRepo,
	)

	// --- i18n ---
	// Always load embedded built-in i18n first (datetime injectors, etc.)
	i18nCfg, err := config.LoadBuiltinInjectorI18n()
	if err != nil {
		return nil, err
	}
	// Merge user-provided i18n file (overrides built-in entries)
	if e.i18nFilePath != "" {
		userI18n, err := config.LoadInjectorI18nFromFile(e.i18nFilePath)
		if err != nil {
			return nil, err
		}
		i18nCfg.Merge(userI18n)
	}

	// --- Extensibility: Registries ---
	mapReg := registry.NewMapperRegistry()
	injReg := registry.NewInjectorRegistry(i18nCfg)

	// Register built-in datetime injectors (useful out of the box)
	builtinInjectors := []port.Injector{
		&datetime.DateNowInjector{},
		&datetime.DateTimeNowInjector{},
		&datetime.DayNowInjector{},
		&datetime.MonthNowInjector{},
		&datetime.TimeNowInjector{},
		&datetime.YearNowInjector{},
	}
	for _, inj := range builtinInjectors {
		_ = injReg.Register(inj)
	}

	// Register user-provided extensions
	for _, inj := range e.injectors {
		if err := injReg.Register(inj); err != nil {
			return nil, err
		}
	}
	if e.mapper != nil {
		if err := mapReg.Set(e.mapper); err != nil {
			return nil, err
		}
	}
	if e.initFunc != nil {
		injReg.SetInitFunc(e.initFunc)
	}

	// --- Services: Organization ---
	workspaceSvc := organizationsvc.NewWorkspaceService(workspaceRepo, tenantRepo, workspaceMemberRepo, userAccessHistoryRepo)
	tenantSvc := organizationsvc.NewTenantService(tenantRepo, workspaceRepo, tenantMemberRepo, systemRoleRepo, userAccessHistoryRepo)
	workspaceMemberSvc := organizationsvc.NewWorkspaceMemberService(workspaceMemberRepo, userRepo)
	tenantMemberSvc := organizationsvc.NewTenantMemberService(tenantMemberRepo, userRepo)

	// --- Services: Catalog ---
	folderSvc := catalogsvc.NewFolderService(folderRepo)
	tagSvc := catalogsvc.NewTagService(tagRepo)
	documentTypeSvc := catalogsvc.NewDocumentTypeService(documentTypeRepo, templateRepo)

	// --- Services: Access ---
	systemRoleSvc := accesssvc.NewSystemRoleService(systemRoleRepo, userRepo)
	userAccessHistorySvc := accesssvc.NewUserAccessHistoryService(userAccessHistoryRepo)

	// --- Services: Injectable ---
	injectableSvc := injectablesvc.NewInjectableService(
		injectableRepo, systemInjectableRepo, injReg,
		workspaceRepo, tenantRepo, e.workspaceProvider,
	)
	workspaceInjectableSvc := injectablesvc.NewWorkspaceInjectableService(workspaceInjectableRepo)
	systemInjectableSvc := injectablesvc.NewSystemInjectableService(systemInjectableRepo, injReg)

	// --- Services: Template ---
	templateSvc := templatesvc.NewTemplateService(templateRepo, templateVersionRepo, templateTagRepo)
	contentValidator := contentvalidator.New(injectableSvc)
	templateVersionSvc := templatesvc.NewTemplateVersionService(
		templateVersionRepo, templateVersionInjectableRepo, templateRepo, contentValidator,
	)

	// --- PDF Renderer ---
	imageCache, err := pdfrenderer.NewImageCache(pdfrenderer.ImageCacheOptions{
		Dir:             cfg.Typst.ImageCacheDir,
		MaxAge:          time.Duration(cfg.Typst.ImageCacheMaxAgeSeconds) * time.Second,
		CleanupInterval: time.Duration(cfg.Typst.ImageCacheCleanupSeconds) * time.Second,
	})
	if err != nil {
		return nil, err
	}

	pdfRenderer, err := pdfrenderer.NewService(pdfrenderer.TypstOptions{
		BinPath:        cfg.Typst.BinPath,
		Timeout:        cfg.Typst.TimeoutDuration(),
		FontDirs:       cfg.Typst.FontDirs,
		MaxConcurrent:  cfg.Typst.MaxConcurrent,
		AcquireTimeout: cfg.Typst.AcquireTimeoutDuration(),
	}, imageCache, e.designTokens)
	if err != nil {
		return nil, err
	}

	// --- Injectable Resolver ---
	injectableResolver := injectablesvc.NewInjectableResolverService(injReg, e.workspaceProvider)

	// --- Template Cache ---
	ttl := time.Duration(cfg.Typst.TemplateCacheTTL) * time.Second
	templateCache, err := templatesvc.NewTemplateCache(int64(cfg.Typst.TemplateCacheMax), ttl)
	if err != nil {
		return nil, err
	}

	internalRenderSvc := templatesvc.NewInternalRenderService(
		tenantRepo, workspaceRepo, documentTypeRepo, templateRepo, templateVersionRepo,
		pdfRenderer, injectableResolver, templateCache,
	)

	// --- HTTP Mappers ---
	injectableMapper := httpmapper.NewInjectableMapper()
	templateVersionMapper := httpmapper.NewTemplateVersionMapper(injectableMapper)
	tagMapper := httpmapper.NewTagMapper()
	folderMapper := httpmapper.NewFolderMapper()
	templateMapper := httpmapper.NewTemplateMapper(templateVersionMapper, tagMapper, folderMapper)

	// --- Controllers ---
	workspaceCtrl := controller.NewWorkspaceController(
		workspaceSvc, folderSvc, tagSvc, workspaceMemberSvc, workspaceInjectableSvc, injectableMapper,
	)
	injectableCtrl := controller.NewContentInjectableController(injectableSvc, injectableMapper)
	renderCtrl := controller.NewRenderController(templateVersionSvc, internalRenderSvc, pdfRenderer)
	templateVersionCtrl := controller.NewTemplateVersionController(
		templateVersionSvc, templateVersionMapper, templateMapper, renderCtrl,
	)
	templateCtrl := controller.NewContentTemplateController(templateSvc, templateMapper, templateVersionCtrl)
	adminCtrl := controller.NewAdminController(tenantSvc, systemRoleSvc, systemInjectableSvc)
	meCtrl := controller.NewMeController(tenantSvc, tenantMemberRepo, workspaceMemberRepo, userAccessHistorySvc)
	tenantCtrl := controller.NewTenantController(tenantSvc, workspaceSvc, tenantMemberSvc)
	documentTypeCtrl := controller.NewDocumentTypeController(documentTypeSvc, templateSvc, templateMapper)

	// --- HTTP Server ---
	httpServer := server.NewHTTPServer(
		cfg,
		middlewareProvider,
		workspaceCtrl,
		injectableCtrl,
		templateCtrl,
		adminCtrl,
		meCtrl,
		tenantCtrl,
		documentTypeCtrl,
		renderCtrl,
		e.globalMiddleware,
		e.apiMiddleware,
		e.renderAuthenticator,
	)

	return &appComponents{
		httpServer: httpServer,
		dbPool:     pool,
	}, nil
}

// seedDummyUser ensures a default admin user exists in the DB for dummy auth mode.
// Returns the internal user ID.
func seedDummyUser(ctx context.Context, pool *pgxpool.Pool) (string, error) {
	const email = "admin@pdfforge.local"
	const fullName = "PDF Forge Admin"
	const externalID = "00000000-0000-0000-0000-000000000001"

	// Upsert user
	var userID string
	err := pool.QueryRow(ctx, `
		INSERT INTO identity.users (email, external_identity_id, full_name, status)
		VALUES ($1, $2, $3, 'ACTIVE')
		ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
		RETURNING id
	`, email, externalID, fullName).Scan(&userID)
	if err != nil {
		return "", fmt.Errorf("seeding dummy user: %w", err)
	}

	// Ensure system role exists
	_, err = pool.Exec(ctx, `
		INSERT INTO identity.system_roles (user_id, role)
		VALUES ($1, 'SUPERADMIN')
		ON CONFLICT (user_id) DO NOTHING
	`, userID)
	if err != nil {
		return "", fmt.Errorf("seeding dummy system role: %w", err)
	}

	return userID, nil
}
