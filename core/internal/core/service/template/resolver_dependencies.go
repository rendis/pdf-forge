package template

import (
	"context"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
)

type templateResolverTenantRepository interface {
	FindByCode(ctx context.Context, code string) (*entity.Tenant, error)
	FindByCodeWithSysWorkspace(ctx context.Context, code string) (*entity.Tenant, *string, error)
	FindSystemTenant(ctx context.Context) (*entity.Tenant, error)
}

type templateResolverWorkspaceRepository interface {
	FindByCodeAndTenant(ctx context.Context, tenantID, code string) (*entity.Workspace, error)
	FindSystemByTenant(ctx context.Context, tenantID *string) (*entity.Workspace, error)
}

type templateResolverDocumentTypeRepository interface {
	FindByCodeWithGlobalFallback(ctx context.Context, tenantID, code string) (*entity.DocumentType, error)
}

type templateResolverTemplateRepository interface {
	FindByDocumentType(ctx context.Context, workspaceID, documentTypeID string) (*entity.Template, error)
	FindByID(ctx context.Context, id string) (*entity.Template, error)
}

type templateResolverTemplateVersionRepository interface {
	FindPublishedByTemplateIDWithDetails(ctx context.Context, templateID string) (*entity.TemplateVersionWithDetails, error)
	FindStagingByTemplateIDWithDetails(ctx context.Context, templateID string) (*entity.TemplateVersionWithDetails, error)
	FindByIDWithDetails(ctx context.Context, id string) (*entity.TemplateVersionWithDetails, error)
	FindByTemplateID(ctx context.Context, templateID string) ([]*entity.TemplateVersion, error)
}

type templateResolutionCache interface {
	Get(tenantCode, workspaceCode, docTypeCode string) *entity.TemplateVersionWithDetails
	Set(tenantCode, workspaceCode, docTypeCode string, version *entity.TemplateVersionWithDetails)
}
