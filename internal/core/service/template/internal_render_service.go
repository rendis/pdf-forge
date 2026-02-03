package template

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/entity/portabledoc"
	"github.com/rendis/pdf-forge/internal/core/port"
	injectablesvc "github.com/rendis/pdf-forge/internal/core/service/injectable"
	templateuc "github.com/rendis/pdf-forge/internal/core/usecase/template"
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
) templateuc.InternalRenderUseCase {
	return &InternalRenderService{
		tenantRepo:    tenantRepo,
		workspaceRepo: workspaceRepo,
		docTypeRepo:   docTypeRepo,
		templateRepo:  templateRepo,
		versionRepo:   versionRepo,
		pdfRenderer:   pdfRenderer,
		resolver:      resolver,
		templateCache: templateCache,
	}
}

// InternalRenderService implements the internal render use case with fallback chain.
type InternalRenderService struct {
	tenantRepo    port.TenantRepository
	workspaceRepo port.WorkspaceRepository
	docTypeRepo   port.DocumentTypeRepository
	templateRepo  port.TemplateRepository
	versionRepo   port.TemplateVersionRepository
	pdfRenderer   port.PDFRenderer
	resolver      *injectablesvc.InjectableResolverService
	templateCache *TemplateCache
}

// RenderByDocumentType resolves a template using the fallback chain and renders a PDF.
func (s *InternalRenderService) RenderByDocumentType(ctx context.Context, cmd templateuc.InternalRenderCommand) (*port.RenderPreviewResult, error) {
	// Check cache first
	if cached := s.templateCache.Get(cmd.TenantCode, cmd.WorkspaceCode, cmd.TemplateTypeCode); cached != nil {
		slog.DebugContext(ctx, "template cache hit",
			slog.String("tenant_code", cmd.TenantCode),
			slog.String("workspace_code", cmd.WorkspaceCode),
			slog.String("template_type_code", cmd.TemplateTypeCode),
		)
		return s.renderVersion(ctx, cached, cmd.Injectables)
	}

	// Cache miss — resolve through fallback chain
	version, err := s.resolveTemplateVersion(ctx, cmd)
	if err != nil {
		return nil, err
	}

	// Store in cache
	s.templateCache.Set(cmd.TenantCode, cmd.WorkspaceCode, cmd.TemplateTypeCode, version)

	return s.renderVersion(ctx, version, cmd.Injectables)
}

// resolveTemplateVersion walks the fallback chain to find a published template version.
func (s *InternalRenderService) resolveTemplateVersion(ctx context.Context, cmd templateuc.InternalRenderCommand) (*entity.TemplateVersionWithDetails, error) {
	tenant, err := s.tenantRepo.FindByCode(ctx, cmd.TenantCode)
	if err != nil {
		return nil, fmt.Errorf("finding tenant by code %q: %w", cmd.TenantCode, err)
	}

	// Attempt 1: exact tenant + exact workspace
	version, err := s.tryResolveVersionByWorkspaceCode(ctx, tenant.ID, cmd.WorkspaceCode, cmd.TemplateTypeCode)
	if err != nil {
		return nil, err
	}
	if version != nil {
		slog.InfoContext(ctx, "template resolved at workspace level",
			slog.String("tenant_code", cmd.TenantCode),
			slog.String("workspace_code", cmd.WorkspaceCode),
		)
		return version, nil
	}

	// Attempt 2: exact tenant + SYSTEM workspace
	version, err = s.tryResolveVersionBySystemWorkspace(ctx, tenant.ID, cmd.TemplateTypeCode)
	if err != nil {
		return nil, err
	}
	if version != nil {
		slog.InfoContext(ctx, "template resolved at tenant system workspace level",
			slog.String("tenant_code", cmd.TenantCode),
		)
		return version, nil
	}

	// Attempt 3: SYS tenant + SYS system workspace
	sysTenant, err := s.tenantRepo.FindSystemTenant(ctx)
	if err != nil {
		return nil, fmt.Errorf("finding system tenant: %w", err)
	}

	version, err = s.tryResolveVersionBySystemWorkspace(ctx, sysTenant.ID, cmd.TemplateTypeCode)
	if err != nil {
		return nil, err
	}
	if version != nil {
		slog.InfoContext(ctx, "template resolved at global system level")
		return version, nil
	}

	return nil, entity.ErrTemplateNotResolved
}

// tryResolveVersionByWorkspaceCode attempts to find a published template version for a specific workspace code.
func (s *InternalRenderService) tryResolveVersionByWorkspaceCode(ctx context.Context, tenantID, workspaceCode, docTypeCode string) (*entity.TemplateVersionWithDetails, error) {
	ws, err := s.workspaceRepo.FindByCodeAndTenant(ctx, tenantID, workspaceCode)
	if errors.Is(err, entity.ErrWorkspaceNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("finding workspace by code: %w", err)
	}

	return s.tryResolveVersionWithWorkspace(ctx, tenantID, ws, docTypeCode)
}

// tryResolveVersionBySystemWorkspace attempts to find a published template version in a tenant's system workspace.
func (s *InternalRenderService) tryResolveVersionBySystemWorkspace(ctx context.Context, tenantID, docTypeCode string) (*entity.TemplateVersionWithDetails, error) {
	ws, err := s.workspaceRepo.FindSystemByTenant(ctx, &tenantID)
	if errors.Is(err, entity.ErrWorkspaceNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("finding system workspace: %w", err)
	}

	return s.tryResolveVersionWithWorkspace(ctx, tenantID, ws, docTypeCode)
}

// tryResolveVersionWithWorkspace attempts to find a published template version.
func (s *InternalRenderService) tryResolveVersionWithWorkspace(ctx context.Context, tenantID string, ws *entity.Workspace, docTypeCode string) (*entity.TemplateVersionWithDetails, error) {
	docType, err := s.docTypeRepo.FindByCode(ctx, tenantID, docTypeCode)
	if errors.Is(err, entity.ErrDocumentTypeNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("finding document type by code: %w", err)
	}

	tmpl, err := s.templateRepo.FindByDocumentType(ctx, ws.ID, docType.ID)
	if err != nil || tmpl == nil {
		return nil, nil //nolint:nilerr // not found means fallback to next level
	}

	version, err := s.versionRepo.FindPublishedByTemplateIDWithDetails(ctx, tmpl.ID)
	if errors.Is(err, entity.ErrVersionNotFound) || errors.Is(err, entity.ErrNoPublishedVersion) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("finding published version: %w", err)
	}

	return version, nil
}

// renderVersion parses the content structure and renders a PDF.
func (s *InternalRenderService) renderVersion(ctx context.Context, version *entity.TemplateVersionWithDetails, injectables map[string]any) (*port.RenderPreviewResult, error) {
	doc, err := portabledoc.Parse(version.ContentStructure)
	if err != nil {
		return nil, fmt.Errorf("parsing content structure: %w", err)
	}

	if doc == nil {
		return nil, fmt.Errorf("version has no content")
	}

	// Resolve system injectables server-side
	injectables = s.resolveSystemInjectables(ctx, version.Injectables, injectables)

	// Build injectable defaults
	defaults := BuildVersionInjectableDefaults(version.Injectables)

	return s.pdfRenderer.RenderPreview(ctx, &port.RenderPreviewRequest{
		Document:           doc,
		Injectables:        injectables,
		InjectableDefaults: defaults,
	})
}

// resolveSystemInjectables resolves system injectable values and merges them with caller-provided values.
// Caller-provided values take priority over resolved values.
func (s *InternalRenderService) resolveSystemInjectables(ctx context.Context, versionInjectables []*entity.VersionInjectableWithDefinition, callerValues map[string]any) map[string]any {
	// Collect system injectable codes
	var systemCodes []string
	for _, inj := range versionInjectables {
		if inj.SystemInjectableKey != nil && *inj.SystemInjectableKey != "" {
			systemCodes = append(systemCodes, *inj.SystemInjectableKey)
		}
	}

	if len(systemCodes) == 0 {
		return callerValues
	}

	// Resolve system injectables
	injCtx := entity.NewInjectorContext("", "", "", "render", nil, nil)
	result, err := s.resolver.Resolve(ctx, injCtx, systemCodes)
	if err != nil {
		slog.WarnContext(ctx, "failed to resolve system injectables",
			slog.Any("error", err),
			slog.Any("codes", systemCodes),
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
