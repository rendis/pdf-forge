package port

import (
	"context"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
)

// WorkspaceFilters defines filters for paginated workspace listing.
type WorkspaceFilters struct {
	Limit  int
	Offset int
	UserID string // Used for access-based sorting
	Query  string // Optional search filter for name
	Status string // Optional status filter (ACTIVE, SUSPENDED, ARCHIVED)
}

// WorkspaceRepository defines the interface for workspace data access.
type WorkspaceRepository interface {
	// Create creates a new workspace.
	Create(ctx context.Context, workspace *entity.Workspace) (string, error)

	// FindByID finds a workspace by ID.
	FindByID(ctx context.Context, id string) (*entity.Workspace, error)

	// FindByTenantPaginated lists workspaces for a tenant with pagination and optional search.
	// When filters.Query is provided, orders by similarity. Otherwise, orders by access history.
	FindByTenantPaginated(ctx context.Context, tenantID string, filters WorkspaceFilters) ([]*entity.Workspace, int64, error)

	// FindByUser lists all workspaces a user has access to.
	FindByUser(ctx context.Context, userID string) ([]*entity.WorkspaceWithRole, error)

	// FindSystemByTenant finds the system workspace for a tenant.
	FindSystemByTenant(ctx context.Context, tenantID *string) (*entity.Workspace, error)

	// Update updates a workspace.
	Update(ctx context.Context, workspace *entity.Workspace) error

	// UpdateStatus updates a workspace's status.
	UpdateStatus(ctx context.Context, id string, status entity.WorkspaceStatus) error

	// Delete deletes a workspace (soft delete by archiving).
	Delete(ctx context.Context, id string) error

	// ExistsSystemForTenant checks if a system workspace exists for a tenant.
	ExistsSystemForTenant(ctx context.Context, tenantID *string) (bool, error)

	// FindByCodeAndTenant finds a workspace by code within a tenant.
	FindByCodeAndTenant(ctx context.Context, tenantID, code string) (*entity.Workspace, error)

	// ExistsByCodeForTenant checks if a workspace code exists for a tenant, optionally excluding a workspace ID.
	ExistsByCodeForTenant(ctx context.Context, tenantID string, code string, excludeID string) (bool, error)
}
