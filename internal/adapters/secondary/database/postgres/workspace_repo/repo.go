package workspacerepo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// New creates a new workspace repository.
func New(pool *pgxpool.Pool) port.WorkspaceRepository {
	return &Repository{pool: pool}
}

// Repository implements the workspace repository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// Create creates a new workspace.
func (r *Repository) Create(ctx context.Context, workspace *entity.Workspace) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, queryCreate,
		workspace.ID,
		workspace.TenantID,
		workspace.Code,
		workspace.Name,
		workspace.Type,
		workspace.Status,
		workspace.CreatedAt,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("inserting workspace: %w", err)
	}

	return id, nil
}

// FindByID finds a workspace by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*entity.Workspace, error) {
	var ws entity.Workspace
	err := r.pool.QueryRow(ctx, queryFindByID, id).Scan(
		&ws.ID,
		&ws.TenantID,
		&ws.Code,
		&ws.Name,
		&ws.Type,
		&ws.Status,
		&ws.CreatedAt,
		&ws.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, entity.ErrWorkspaceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("querying workspace: %w", err)
	}

	return &ws, nil
}

// FindByTenantPaginated lists workspaces for a tenant with pagination and optional search.
// When filters.Query is provided, orders by similarity. Otherwise, orders by access history.
func (r *Repository) FindByTenantPaginated(ctx context.Context, tenantID string, filters port.WorkspaceFilters) ([]*entity.Workspace, int64, error) {
	var total int64

	// Get total count with search and status filter
	if err := r.pool.QueryRow(ctx, queryCountByTenant, tenantID, filters.Query, filters.Status).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting workspaces: %w", err)
	}

	// Query with unified ordering (similarity when Query provided, access history otherwise)
	rows, err := r.pool.Query(ctx, queryFindByTenantPaginated, tenantID, filters.UserID, filters.Query, filters.Limit, filters.Offset, filters.Status)
	if err != nil {
		return nil, 0, fmt.Errorf("querying workspaces: %w", err)
	}
	defer rows.Close()

	workspaces, err := scanWorkspaces(rows)
	if err != nil {
		return nil, 0, err
	}

	return workspaces, total, nil
}

// FindByUser lists all workspaces a user has access to.
func (r *Repository) FindByUser(ctx context.Context, userID string) ([]*entity.WorkspaceWithRole, error) {
	rows, err := r.pool.Query(ctx, queryFindByUser, userID)
	if err != nil {
		return nil, fmt.Errorf("querying user workspaces: %w", err)
	}
	defer rows.Close()

	return scanWorkspacesWithRole(rows)
}

// FindSystemByTenant finds the system workspace for a tenant.
func (r *Repository) FindSystemByTenant(ctx context.Context, tenantID *string) (*entity.Workspace, error) {
	var query string
	var args []any

	if tenantID == nil {
		query = queryFindSystemByTenantNull
	} else {
		query = queryFindSystemByTenant
		args = append(args, *tenantID)
	}

	var ws entity.Workspace
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&ws.ID,
		&ws.TenantID,
		&ws.Code,
		&ws.Name,
		&ws.Type,
		&ws.Status,
		&ws.CreatedAt,
		&ws.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, entity.ErrWorkspaceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("querying system workspace: %w", err)
	}

	return &ws, nil
}

// FindByCodeAndTenant finds a workspace by code within a tenant.
func (r *Repository) FindByCodeAndTenant(ctx context.Context, tenantID, code string) (*entity.Workspace, error) {
	var ws entity.Workspace
	err := r.pool.QueryRow(ctx, queryFindByCodeAndTenant, tenantID, code).Scan(
		&ws.ID,
		&ws.TenantID,
		&ws.Code,
		&ws.Name,
		&ws.Type,
		&ws.Status,
		&ws.CreatedAt,
		&ws.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, entity.ErrWorkspaceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("querying workspace by code and tenant: %w", err)
	}

	return &ws, nil
}

// Update updates a workspace.
func (r *Repository) Update(ctx context.Context, workspace *entity.Workspace) error {
	_, err := r.pool.Exec(ctx, queryUpdate,
		workspace.ID,
		workspace.Code,
		workspace.Name,
		workspace.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("updating workspace: %w", err)
	}

	return nil
}

// UpdateStatus updates a workspace's status.
func (r *Repository) UpdateStatus(ctx context.Context, id string, status entity.WorkspaceStatus) error {
	result, err := r.pool.Exec(ctx, queryUpdateStatus, id, status)
	if err != nil {
		return fmt.Errorf("updating workspace status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrWorkspaceNotFound
	}

	return nil
}

// Delete deletes a workspace (soft delete by archiving).
func (r *Repository) Delete(ctx context.Context, id string) error {
	return r.UpdateStatus(ctx, id, entity.WorkspaceStatusArchived)
}

// ExistsSystemForTenant checks if a system workspace exists for a tenant.
func (r *Repository) ExistsSystemForTenant(ctx context.Context, tenantID *string) (bool, error) {
	var query string
	var args []any

	if tenantID == nil {
		query = queryExistsSystemForTenantNull
	} else {
		query = queryExistsSystemForTenant
		args = append(args, *tenantID)
	}

	var exists bool
	err := r.pool.QueryRow(ctx, query, args...).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking system workspace existence: %w", err)
	}

	return exists, nil
}

// ExistsByCodeForTenant checks if a workspace code exists for a tenant, optionally excluding a workspace ID.
func (r *Repository) ExistsByCodeForTenant(ctx context.Context, tenantID string, code string, excludeID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByCodeForTenant, tenantID, code, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking workspace code existence: %w", err)
	}

	return exists, nil
}

// scanWorkspaces scans workspace rows into a slice.
func scanWorkspaces(rows pgx.Rows) ([]*entity.Workspace, error) {
	var result []*entity.Workspace
	for rows.Next() {
		var ws entity.Workspace
		err := rows.Scan(
			&ws.ID,
			&ws.TenantID,
			&ws.Code,
			&ws.Name,
			&ws.Type,
			&ws.Status,
			&ws.CreatedAt,
			&ws.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning workspace: %w", err)
		}
		result = append(result, &ws)
	}
	return result, rows.Err()
}

// scanWorkspacesWithRole scans workspace rows with role into a slice.
func scanWorkspacesWithRole(rows pgx.Rows) ([]*entity.WorkspaceWithRole, error) {
	var result []*entity.WorkspaceWithRole
	for rows.Next() {
		var ws entity.Workspace
		var role entity.WorkspaceRole
		err := rows.Scan(
			&ws.ID,
			&ws.TenantID,
			&ws.Code,
			&ws.Name,
			&ws.Type,
			&ws.Status,
			&ws.CreatedAt,
			&ws.UpdatedAt,
			&role,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning workspace with role: %w", err)
		}
		result = append(result, &entity.WorkspaceWithRole{
			Workspace: ws,
			Role:      role,
		})
	}
	return result, rows.Err()
}
