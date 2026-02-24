package template

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// TemplateVersionSearchAdapter provides read-only template version search for custom resolvers.
type TemplateVersionSearchAdapter struct {
	tenantRepo    templateResolverTenantRepository
	workspaceRepo templateResolverWorkspaceRepository
	docTypeRepo   templateResolverDocumentTypeRepository
	templateRepo  templateResolverTemplateRepository
	versionRepo   templateResolverTemplateVersionRepository
}

// NewTemplateVersionSearchAdapter builds a new read-only search adapter.
func NewTemplateVersionSearchAdapter(
	tenantRepo port.TenantRepository,
	workspaceRepo port.WorkspaceRepository,
	docTypeRepo port.DocumentTypeRepository,
	templateRepo port.TemplateRepository,
	versionRepo port.TemplateVersionRepository,
) port.TemplateVersionSearchAdapter {
	return &TemplateVersionSearchAdapter{
		tenantRepo:    tenantRepo,
		workspaceRepo: workspaceRepo,
		docTypeRepo:   docTypeRepo,
		templateRepo:  templateRepo,
		versionRepo:   versionRepo,
	}
}

// searchContext holds resolved entities needed for the workspace-level search loop.
type searchContext struct {
	tenant        *entity.Tenant
	docType       *entity.DocumentType
	wantPublished bool
	wantStaging   bool
}

// SearchTemplateVersions returns deterministic candidates by tenant/workspace/document type.
func (a *TemplateVersionSearchAdapter) SearchTemplateVersions(ctx context.Context, params port.TemplateVersionSearchParams) ([]port.TemplateVersionSearchItem, error) {
	if err := validateSearchParams(params); err != nil {
		return nil, err
	}

	sc, err := a.resolveSearchContext(ctx, params)
	if err != nil {
		return nil, err
	}
	if sc == nil {
		return []port.TemplateVersionSearchItem{}, nil
	}

	results := make([]port.TemplateVersionSearchItem, 0, len(params.WorkspaceCodes))
	for _, code := range params.WorkspaceCodes {
		items, err := a.collectWorkspaceVersions(ctx, sc, code)
		if err != nil {
			return nil, err
		}
		results = append(results, items...)
	}

	return results, nil
}

// validateSearchParams checks that all required fields are present.
func validateSearchParams(params port.TemplateVersionSearchParams) error {
	if strings.TrimSpace(params.TenantCode) == "" {
		return fmt.Errorf("tenantCode is required")
	}
	if len(params.WorkspaceCodes) == 0 {
		return fmt.Errorf("workspaceCodes is required")
	}
	if strings.TrimSpace(params.DocumentType) == "" {
		return fmt.Errorf("documentType is required")
	}
	return nil
}

// resolveSearchContext resolves the tenant and document type from codes.
// Returns nil context (no error) when the tenant or document type does not exist.
func (a *TemplateVersionSearchAdapter) resolveSearchContext(ctx context.Context, params port.TemplateVersionSearchParams) (*searchContext, error) {
	tenant, err := a.tenantRepo.FindByCode(ctx, strings.ToUpper(strings.TrimSpace(params.TenantCode)))
	if err != nil {
		if errors.Is(err, entity.ErrTenantNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("finding tenant by code: %w", err)
	}

	docType, err := a.docTypeRepo.FindByCodeWithGlobalFallback(ctx, tenant.ID, strings.ToUpper(strings.TrimSpace(params.DocumentType)))
	if err != nil {
		if errors.Is(err, entity.ErrDocumentTypeNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("finding document type by code: %w", err)
	}

	wantPublished := true
	if params.Published != nil {
		wantPublished = *params.Published
	}

	wantStaging := false
	if params.Staging != nil {
		wantStaging = *params.Staging
	}

	return &searchContext{tenant: tenant, docType: docType, wantPublished: wantPublished, wantStaging: wantStaging}, nil
}

// collectWorkspaceVersions finds template versions for a single workspace code.
func (a *TemplateVersionSearchAdapter) collectWorkspaceVersions(
	ctx context.Context,
	sc *searchContext,
	workspaceCode string,
) ([]port.TemplateVersionSearchItem, error) {
	workspaceCode = strings.ToUpper(strings.TrimSpace(workspaceCode))

	workspace, err := a.workspaceRepo.FindByCodeAndTenant(ctx, sc.tenant.ID, workspaceCode)
	if err != nil {
		if errors.Is(err, entity.ErrWorkspaceNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("finding workspace by code: %w", err)
	}

	tmpl, err := a.templateRepo.FindByDocumentType(ctx, workspace.ID, sc.docType.ID)
	if err != nil {
		return nil, fmt.Errorf("finding template by document type: %w", err)
	}
	if tmpl == nil {
		return nil, nil
	}

	if sc.wantStaging {
		return a.collectStagingVersion(ctx, sc.tenant.Code, workspace.Code, tmpl.ID)
	}
	if sc.wantPublished {
		return a.collectPublishedVersion(ctx, sc.tenant.Code, workspace.Code, tmpl.ID)
	}
	return a.collectDraftVersions(ctx, sc.tenant.Code, workspace.Code, tmpl.ID)
}

// collectPublishedVersion returns the single published version for a template, if any.
func (a *TemplateVersionSearchAdapter) collectPublishedVersion(
	ctx context.Context,
	tenantCode, workspaceCode string,
	templateID string,
) ([]port.TemplateVersionSearchItem, error) {
	version, err := a.versionRepo.FindPublishedByTemplateIDWithDetails(ctx, templateID)
	if err != nil {
		if errors.Is(err, entity.ErrVersionNotFound) || errors.Is(err, entity.ErrNoPublishedVersion) {
			return nil, nil
		}
		return nil, fmt.Errorf("finding published version: %w", err)
	}

	return []port.TemplateVersionSearchItem{{
		Published:     true,
		TenantCode:    tenantCode,
		WorkspaceCode: workspaceCode,
		VersionID:     version.ID,
	}}, nil
}

// collectStagingVersion returns the single staging version for a template, if any.
func (a *TemplateVersionSearchAdapter) collectStagingVersion(
	ctx context.Context,
	tenantCode, workspaceCode string,
	templateID string,
) ([]port.TemplateVersionSearchItem, error) {
	version, err := a.versionRepo.FindStagingByTemplateIDWithDetails(ctx, templateID)
	if err != nil {
		if errors.Is(err, entity.ErrVersionNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("finding staging version: %w", err)
	}

	return []port.TemplateVersionSearchItem{{
		Published:     false,
		TenantCode:    tenantCode,
		WorkspaceCode: workspaceCode,
		VersionID:     version.ID,
	}}, nil
}

// collectDraftVersions returns all non-published versions for a template.
func (a *TemplateVersionSearchAdapter) collectDraftVersions(
	ctx context.Context,
	tenantCode, workspaceCode string,
	templateID string,
) ([]port.TemplateVersionSearchItem, error) {
	versions, err := a.versionRepo.FindByTemplateID(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("finding versions by template: %w", err)
	}

	var results []port.TemplateVersionSearchItem
	for _, v := range versions {
		if v.IsPublished() {
			continue
		}
		results = append(results, port.TemplateVersionSearchItem{
			Published:     false,
			TenantCode:    tenantCode,
			WorkspaceCode: workspaceCode,
			VersionID:     v.ID,
		})
	}
	return results, nil
}
