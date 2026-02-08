package port

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity"
)

// TemplateFilters contains optional filters for template queries.
type TemplateFilters struct {
	FolderID            *string
	RootOnly            bool  // Filter for root folder only (folder_id IS NULL)
	HasPublishedVersion *bool // Filter by whether template has a published version
	TagIDs              []string
	DocumentTypeID      *string // Filter by document type ID
	DocumentTypeCode    string  // Filter by document type code
	Search              string
	Limit               int
	Offset              int
}

// TemplateRepository defines the interface for template data access.
type TemplateRepository interface {
	// Create creates a new template.
	Create(ctx context.Context, template *entity.Template) (string, error)

	// FindByID finds a template by ID.
	FindByID(ctx context.Context, id string) (*entity.Template, error)

	// FindByIDWithDetails finds a template by ID with published version, tags, and folder.
	FindByIDWithDetails(ctx context.Context, id string) (*entity.TemplateWithDetails, error)

	// FindByIDWithAllVersions finds a template by ID with all versions.
	FindByIDWithAllVersions(ctx context.Context, id string) (*entity.TemplateWithAllVersions, error)

	// FindByWorkspace lists all templates in a workspace.
	FindByWorkspace(ctx context.Context, workspaceID string, filters TemplateFilters) ([]*entity.TemplateListItem, error)

	// FindByFolder lists all templates in a folder.
	FindByFolder(ctx context.Context, folderID string) ([]*entity.TemplateListItem, error)

	// FindPublicLibrary lists all public library templates.
	FindPublicLibrary(ctx context.Context, workspaceID string) ([]*entity.TemplateListItem, error)

	// Update updates a template.
	Update(ctx context.Context, template *entity.Template) error

	// Delete deletes a template.
	Delete(ctx context.Context, id string) error

	// ExistsByTitle checks if a template with the given title exists in the workspace.
	ExistsByTitle(ctx context.Context, workspaceID, title string) (bool, error)

	// ExistsByTitleExcluding checks excluding a specific template ID.
	ExistsByTitleExcluding(ctx context.Context, workspaceID, title, excludeID string) (bool, error)

	// CountByFolder returns the number of templates in a folder.
	CountByFolder(ctx context.Context, folderID string) (int, error)

	// FindByDocumentType finds the template assigned to a document type in a workspace.
	// Returns nil if no template is assigned to this type in the workspace.
	FindByDocumentType(ctx context.Context, workspaceID, documentTypeID string) (*entity.Template, error)

	// FindByDocumentTypeCode finds templates by document type code across a tenant.
	FindByDocumentTypeCode(ctx context.Context, tenantID, documentTypeCode string) ([]*entity.TemplateListItem, error)

	// UpdateDocumentType updates the document type assignment for a template.
	UpdateDocumentType(ctx context.Context, templateID string, documentTypeID *string) error
}
