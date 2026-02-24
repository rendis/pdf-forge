package template

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
	"github.com/rendis/pdf-forge/core/internal/core/port"
	injectablesvc "github.com/rendis/pdf-forge/core/internal/core/service/injectable"
	templateuc "github.com/rendis/pdf-forge/core/internal/core/usecase/template"
)

// NewInternalRenderService creates a new internal render service.
func NewInternalRenderService(
	tenantRepo port.TenantRepository,
	workspaceRepo port.WorkspaceRepository,
	docTypeRepo port.DocumentTypeRepository,
	templateRepo port.TemplateRepository,
	versionRepo port.TemplateVersionRepository,
	pdfRenderer port.PDFRenderer,
	resolver *injectablesvc.InjectableResolverService,
	templateCache *TemplateCache,
	customResolver port.TemplateResolver,
	storageProvider port.StorageProvider,
) templateuc.InternalRenderUseCase {
	return &InternalRenderService{
		tenantRepo:      tenantRepo,
		workspaceRepo:   workspaceRepo,
		docTypeRepo:     docTypeRepo,
		templateRepo:    templateRepo,
		versionRepo:     versionRepo,
		pdfRenderer:     pdfRenderer,
		resolver:        resolver,
		templateCache:   templateCache,
		customResolver:  customResolver,
		storageProvider: storageProvider,
		defaultResolver: NewDefaultTemplateResolver(),
		searchAdapter: NewTemplateVersionSearchAdapter(
			tenantRepo,
			workspaceRepo,
			docTypeRepo,
			templateRepo,
			versionRepo,
		),
	}
}

// InternalRenderService implements the internal render use case with fallback chain.
type InternalRenderService struct {
	tenantRepo      templateResolverTenantRepository
	workspaceRepo   templateResolverWorkspaceRepository
	docTypeRepo     templateResolverDocumentTypeRepository
	templateRepo    templateResolverTemplateRepository
	versionRepo     templateResolverTemplateVersionRepository
	pdfRenderer     port.PDFRenderer
	resolver        *injectablesvc.InjectableResolverService
	templateCache   templateResolutionCache
	customResolver  port.TemplateResolver
	storageProvider port.StorageProvider
	defaultResolver port.TemplateResolver
	searchAdapter   port.TemplateVersionSearchAdapter
}

// RenderByDocumentType resolves a template using the fallback chain and renders a PDF.
func (s *InternalRenderService) RenderByDocumentType(ctx context.Context, cmd templateuc.InternalRenderCommand) (*port.RenderPreviewResult, error) {
	// Custom resolver is always evaluated first. If it resolves, bypass cache.
	if s.customResolver != nil {
		customVersion, err := s.resolveWithCustomResolver(ctx, cmd)
		if err != nil {
			return nil, err
		}
		if customVersion != nil {
			slog.InfoContext(ctx, "template resolved by custom resolver",
				slog.String("tenant_code", cmd.TenantCode),
				slog.String("workspace_code", cmd.WorkspaceCode),
				slog.String("template_type_code", cmd.TemplateTypeCode),
				slog.String("version_id", customVersion.ID),
			)
			return s.renderVersion(ctx, customVersion, cmd)
		}
	}

	// Dev environment: skip cache entirely (cache stores PUBLISHED versions)
	if !cmd.Environment.IsDev() && s.templateCache != nil {
		if cached := s.templateCache.Get(cmd.TenantCode, cmd.WorkspaceCode, cmd.TemplateTypeCode); cached != nil {
			slog.DebugContext(ctx, "template cache hit",
				slog.String("tenant_code", cmd.TenantCode),
				slog.String("workspace_code", cmd.WorkspaceCode),
				slog.String("template_type_code", cmd.TemplateTypeCode),
			)
			return s.renderVersion(ctx, cached, cmd)
		}
	}

	// Cache miss — resolve through fallback chain
	version, err := s.resolveWithDefaultResolver(ctx, cmd)
	if err != nil {
		return nil, err
	}

	// Only cache published resolutions
	if !cmd.Environment.IsDev() && s.templateCache != nil {
		s.templateCache.Set(cmd.TenantCode, cmd.WorkspaceCode, cmd.TemplateTypeCode, version)
	}

	return s.renderVersion(ctx, version, cmd)
}

// RenderByVersionID renders a specific template version by ID, bypassing document type resolution.
func (s *InternalRenderService) RenderByVersionID(ctx context.Context, cmd templateuc.RenderByVersionIDCommand) (*port.RenderPreviewResult, error) {
	version, err := s.versionRepo.FindByIDWithDetails(ctx, cmd.VersionID)
	if err != nil {
		return nil, fmt.Errorf("finding version %s: %w", cmd.VersionID, err)
	}

	return s.renderVersion(ctx, version, templateuc.InternalRenderCommand{
		TenantCode:    cmd.TenantCode,
		WorkspaceCode: cmd.WorkspaceCode,
		Injectables:   cmd.Injectables,
		Headers:       cmd.Headers,
		Payload:       cmd.Payload,
		Environment:   cmd.Environment,
	})
}

func (s *InternalRenderService) resolveWithCustomResolver(
	ctx context.Context,
	cmd templateuc.InternalRenderCommand,
) (*entity.TemplateVersionWithDetails, error) {
	rawBody, err := json.Marshal(cmd.Payload)
	if err != nil {
		rawBody = nil
	}

	versionID, err := s.customResolver.Resolve(ctx, &port.TemplateResolverRequest{
		TenantCode:    cmd.TenantCode,
		WorkspaceCode: cmd.WorkspaceCode,
		DocumentType:  cmd.TemplateTypeCode,
		Headers:       cmd.Headers,
		RawBody:       rawBody,
		Injectables:   cmd.Injectables,
		Environment:   cmd.Environment,
	}, s.searchAdapter)
	if err != nil {
		return nil, fmt.Errorf("custom template resolver failed: %w", err)
	}
	if versionID == nil || *versionID == "" {
		return nil, nil
	}

	return s.validateCustomResolvedVersion(ctx, cmd, *versionID)
}

func (s *InternalRenderService) resolveWithDefaultResolver(
	ctx context.Context,
	cmd templateuc.InternalRenderCommand,
) (*entity.TemplateVersionWithDetails, error) {
	versionID, err := s.defaultResolver.Resolve(ctx, &port.TemplateResolverRequest{
		TenantCode:    cmd.TenantCode,
		WorkspaceCode: cmd.WorkspaceCode,
		DocumentType:  cmd.TemplateTypeCode,
		Environment:   cmd.Environment,
	}, s.searchAdapter)
	if err != nil {
		return nil, err
	}
	if versionID == nil || *versionID == "" {
		return nil, entity.ErrTemplateNotResolved
	}

	version, err := s.versionRepo.FindByIDWithDetails(ctx, *versionID)
	if err != nil {
		if errors.Is(err, entity.ErrVersionNotFound) {
			return nil, entity.ErrTemplateNotResolved
		}
		return nil, fmt.Errorf("finding version %s: %w", *versionID, err)
	}
	if !isRenderableVersion(version, cmd.Environment) {
		return nil, entity.ErrTemplateNotResolved
	}

	return version, nil
}

func (s *InternalRenderService) validateCustomResolvedVersion(
	ctx context.Context,
	cmd templateuc.InternalRenderCommand,
	versionID string,
) (*entity.TemplateVersionWithDetails, error) {
	version, err := s.versionRepo.FindByIDWithDetails(ctx, versionID)
	if err != nil {
		if errors.Is(err, entity.ErrVersionNotFound) {
			return nil, entity.ErrTemplateNotResolved
		}
		return nil, fmt.Errorf("finding version %s: %w", versionID, err)
	}
	if !isRenderableVersion(version, cmd.Environment) {
		return nil, entity.ErrTemplateNotResolved
	}

	if err := s.validateVersionOwnership(ctx, cmd, version); err != nil {
		return nil, err
	}

	return version, nil
}

// isRenderableVersion checks if a version can be rendered: published always, staging only in dev environment.
func isRenderableVersion(v *entity.TemplateVersionWithDetails, env entity.Environment) bool {
	return v.IsPublished() || (env.IsDev() && v.IsStaging())
}

func (s *InternalRenderService) validateVersionOwnership(
	ctx context.Context,
	cmd templateuc.InternalRenderCommand,
	version *entity.TemplateVersionWithDetails,
) error {
	tenant, err := s.tenantRepo.FindByCode(ctx, cmd.TenantCode)
	if err != nil {
		if errors.Is(err, entity.ErrTenantNotFound) {
			return entity.ErrTemplateNotResolved
		}
		return fmt.Errorf("finding tenant by code %q: %w", cmd.TenantCode, err)
	}

	docType, err := s.docTypeRepo.FindByCodeWithGlobalFallback(ctx, tenant.ID, cmd.TemplateTypeCode)
	if err != nil {
		if errors.Is(err, entity.ErrDocumentTypeNotFound) {
			return entity.ErrTemplateNotResolved
		}
		return fmt.Errorf("finding document type by code: %w", err)
	}

	tmpl, err := s.templateRepo.FindByID(ctx, version.TemplateID)
	if err != nil {
		if errors.Is(err, entity.ErrTemplateNotFound) {
			return entity.ErrTemplateNotResolved
		}
		return fmt.Errorf("finding template %s: %w", version.TemplateID, err)
	}
	if tmpl.DocumentTypeID == nil || *tmpl.DocumentTypeID != docType.ID {
		return entity.ErrTemplateNotResolved
	}

	return nil
}

// renderVersion parses the content structure and renders a PDF.
func (s *InternalRenderService) renderVersion(ctx context.Context, version *entity.TemplateVersionWithDetails, cmd templateuc.InternalRenderCommand) (*port.RenderPreviewResult, error) {
	doc, err := portabledoc.Parse(version.ContentStructure)
	if err != nil {
		return nil, fmt.Errorf("parsing content structure: %w", err)
	}

	if doc == nil {
		return nil, fmt.Errorf("version has no content")
	}

	// Resolve all injectables (system + custom registry + provider)
	injectables := s.resolveInjectables(ctx, version.Injectables, cmd.Injectables, cmd.TenantCode, cmd.WorkspaceCode, cmd.Environment, cmd.Headers, cmd.Payload)

	// Build injectable defaults
	defaults := BuildVersionInjectableDefaults(version.Injectables)

	renderReq := &port.RenderPreviewRequest{
		Document:           doc,
		Injectables:        injectables,
		InjectableDefaults: defaults,
	}

	if s.storageProvider != nil {
		renderReq.ImageURLResolver = s.buildStorageURLResolver(cmd.TenantCode, cmd.WorkspaceCode)
	}

	return s.pdfRenderer.RenderPreview(ctx, renderReq)
}

// buildStorageURLResolver returns an ImageURLResolver that resolves storage:// URLs
// using the configured StorageProvider.
func (s *InternalRenderService) buildStorageURLResolver(tenantCode, workspaceCode string) func(context.Context, string) (string, error) {
	return func(ctx context.Context, url string) (string, error) {
		if !strings.HasPrefix(url, "storage://") {
			return url, nil
		}
		key := strings.TrimPrefix(url, "storage://")
		result, err := s.storageProvider.GetURL(ctx, &port.StorageGetURLRequest{
			Storage: port.StorageContext{
				TenantCode:    tenantCode,
				WorkspaceCode: workspaceCode,
			},
			Key: key,
		})
		if err != nil {
			return "", err
		}
		return result.URL, nil
	}
}

// resolveInjectables resolves all injectable values (system, registry, and provider)
// and merges them with caller-provided values. Caller-provided values take priority.
func (s *InternalRenderService) resolveInjectables(
	ctx context.Context,
	versionInjectables []*entity.VersionInjectableWithDefinition,
	callerValues map[string]any,
	tenantCode, workspaceCode string,
	env entity.Environment,
	headers map[string]string,
	payload any,
) map[string]any {
	// Collect all injectable codes (system + workspace/custom)
	var codes []string
	for _, inj := range versionInjectables {
		if inj.SystemInjectableKey != nil && *inj.SystemInjectableKey != "" {
			codes = append(codes, *inj.SystemInjectableKey)
		} else if inj.Definition != nil && inj.Definition.Key != "" {
			codes = append(codes, inj.Definition.Key)
		}
	}

	if len(codes) == 0 {
		return callerValues
	}

	// Resolve injectables with full context (headers, payload, tenant/workspace codes)
	injCtx := entity.NewInjectorContextWithCodes("", "", "", "render", tenantCode, workspaceCode, env, headers, payload)
	result, err := s.resolver.Resolve(ctx, injCtx, codes)
	if err != nil {
		slog.WarnContext(ctx, "failed to resolve injectables",
			slog.Any("error", err),
			slog.Any("codes", codes),
		)
		return callerValues
	}

	// Merge: resolved values as base, caller values override
	merged := make(map[string]any, len(callerValues)+len(result.Values))
	for code, val := range result.Values {
		merged[code] = val.AsAny()
	}
	for key, val := range callerValues {
		merged[key] = val
	}

	return merged
}

// BuildVersionInjectableDefaults builds a map of default values from version injectables.
// Priority: TemplateVersionInjectable.DefaultValue > InjectableDefinition.DefaultValue.
func BuildVersionInjectableDefaults(injectables []*entity.VersionInjectableWithDefinition) map[string]string {
	defaults := make(map[string]string)

	for _, injectable := range injectables {
		var variableID string
		if injectable.Definition != nil {
			variableID = injectable.Definition.Key
		} else if injectable.SystemInjectableKey != nil {
			variableID = *injectable.SystemInjectableKey
		} else {
			continue
		}

		if injectable.DefaultValue != nil && *injectable.DefaultValue != "" {
			defaults[variableID] = *injectable.DefaultValue
			continue
		}

		if injectable.Definition != nil && injectable.Definition.DefaultValue != nil && *injectable.Definition.DefaultValue != "" {
			defaults[variableID] = *injectable.Definition.DefaultValue
		}
	}

	return defaults
}
