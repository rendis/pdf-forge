package systeminjectablerepo

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// New creates a new system injectable repository.
func New(pool *pgxpool.Pool) port.SystemInjectableRepository {
	return &Repository{pool: pool}
}

// Repository implements port.SystemInjectableRepository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// FindActiveKeysForWorkspace returns the keys of active system injectables for a workspace.
func (r *Repository) FindActiveKeysForWorkspace(ctx context.Context, workspaceID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, queryFindActiveKeysForWorkspace, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("querying active system injectable keys: %w", err)
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, fmt.Errorf("scanning system injectable key: %w", err)
		}
		keys = append(keys, key)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating system injectable keys: %w", err)
	}

	return keys, nil
}

// FindAllDefinitions returns a map of all definition keys to their is_active status.
func (r *Repository) FindAllDefinitions(ctx context.Context) (map[string]bool, error) {
	rows, err := r.pool.Query(ctx, queryFindAllDefinitions)
	if err != nil {
		return nil, fmt.Errorf("querying all definitions: %w", err)
	}
	defer rows.Close()

	result := make(map[string]bool)
	for rows.Next() {
		var key string
		var isActive bool
		if err := rows.Scan(&key, &isActive); err != nil {
			return nil, fmt.Errorf("scanning definition: %w", err)
		}
		result[key] = isActive
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating definitions: %w", err)
	}

	return result, nil
}

// UpsertDefinition creates or updates a system injectable definition.
func (r *Repository) UpsertDefinition(ctx context.Context, key string, isActive bool) error {
	_, err := r.pool.Exec(ctx, queryUpsertDefinition, key, isActive)
	if err != nil {
		return fmt.Errorf("upserting definition %s: %w", key, err)
	}
	return nil
}

// FindAssignmentsByKey returns all assignments for a given injectable key with tenant/workspace names.
func (r *Repository) FindAssignmentsByKey(ctx context.Context, key string) ([]*entity.SystemInjectableAssignment, error) {
	rows, err := r.pool.Query(ctx, queryFindAssignmentsByKey, key)
	if err != nil {
		return nil, fmt.Errorf("querying assignments for key %s: %w", key, err)
	}
	defer rows.Close()

	var assignments []*entity.SystemInjectableAssignment
	for rows.Next() {
		var a entity.SystemInjectableAssignment
		var scopeType string
		var workspaceTenantID *string
		var workspaceTenantName *string
		if err := rows.Scan(
			&a.ID,
			&a.InjectableKey,
			&scopeType,
			&a.TenantID,
			&a.TenantName,
			&a.WorkspaceID,
			&a.WorkspaceName,
			&workspaceTenantID,
			&workspaceTenantName,
			&a.IsActive,
			&a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning assignment: %w", err)
		}
		a.ScopeType = entity.InjectableScopeType(scopeType)

		// For WORKSPACE scope, set TenantID and TenantName from workspace's tenant
		if a.ScopeType == entity.InjectableScopeWorkspace {
			a.TenantID = workspaceTenantID
			a.TenantName = workspaceTenantName
		}

		assignments = append(assignments, &a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating assignments: %w", err)
	}

	return assignments, nil
}

// CreateAssignment creates a new assignment.
func (r *Repository) CreateAssignment(ctx context.Context, assignment *entity.SystemInjectableAssignment) error {
	_, err := r.pool.Exec(ctx, queryCreateAssignment,
		assignment.ID,
		assignment.InjectableKey,
		string(assignment.ScopeType),
		assignment.TenantID,
		assignment.WorkspaceID,
		assignment.IsActive,
	)
	if err != nil {
		return fmt.Errorf("creating assignment: %w", err)
	}
	return nil
}

// DeleteAssignment removes an assignment by ID.
func (r *Repository) DeleteAssignment(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, queryDeleteAssignment, id)
	if err != nil {
		return fmt.Errorf("deleting assignment %s: %w", id, err)
	}
	if result.RowsAffected() == 0 {
		return entity.ErrAssignmentNotFound
	}
	return nil
}

// SetAssignmentActive updates the is_active flag for an assignment.
func (r *Repository) SetAssignmentActive(ctx context.Context, id string, isActive bool) error {
	result, err := r.pool.Exec(ctx, querySetAssignmentActive, isActive, id)
	if err != nil {
		return fmt.Errorf("updating assignment %s is_active: %w", id, err)
	}
	if result.RowsAffected() == 0 {
		return entity.ErrAssignmentNotFound
	}
	return nil
}

// FindPublicActiveKeys returns a set of injectable keys that have an active PUBLIC assignment.
func (r *Repository) FindPublicActiveKeys(ctx context.Context) (map[string]bool, error) {
	rows, err := r.pool.Query(ctx, queryFindPublicActiveKeys)
	if err != nil {
		return nil, fmt.Errorf("querying public active keys: %w", err)
	}
	defer rows.Close()

	result := make(map[string]bool)
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, fmt.Errorf("scanning public active key: %w", err)
		}
		result[key] = true
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating public active keys: %w", err)
	}

	return result, nil
}

// BulkUpsertDefinitions creates or updates definitions for multiple keys with the given is_active status.
func (r *Repository) BulkUpsertDefinitions(ctx context.Context, keys []string, isActive bool) error {
	if len(keys) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	for _, key := range keys {
		batch.Queue(queryUpsertDefinition, key, isActive)
	}

	results := r.pool.SendBatch(ctx, batch)
	defer results.Close()

	for i := 0; i < len(keys); i++ {
		if _, err := results.Exec(); err != nil {
			return fmt.Errorf("upserting definition for key %s: %w", keys[i], err)
		}
	}

	return nil
}

// CreateScopedAssignments creates assignments for multiple keys at the given scope.
func (r *Repository) CreateScopedAssignments(ctx context.Context, keys []string, scopeType string, tenantID *string, workspaceID *string) (int, error) {
	if len(keys) == 0 {
		return 0, nil
	}

	batch := &pgx.Batch{}
	for _, key := range keys {
		batch.Queue(queryCreateScopedAssignment, key, scopeType, tenantID, workspaceID)
	}

	results := r.pool.SendBatch(ctx, batch)
	defer results.Close()

	created := 0
	for i := 0; i < len(keys); i++ {
		result, err := results.Exec()
		if err != nil {
			return created, fmt.Errorf("creating %s assignment for key %s: %w", scopeType, keys[i], err)
		}
		if result.RowsAffected() > 0 {
			created++
		}
	}

	return created, nil
}

// DeleteScopedAssignments deletes assignments for multiple keys at the given scope.
func (r *Repository) DeleteScopedAssignments(ctx context.Context, keys []string, scopeType string, tenantID *string, workspaceID *string) (int, error) {
	if len(keys) == 0 {
		return 0, nil
	}

	var result pgconn.CommandTag
	var err error

	switch scopeType {
	case "PUBLIC":
		result, err = r.pool.Exec(ctx, queryDeleteScopedAssignmentsPublic, keys)
	case "TENANT":
		result, err = r.pool.Exec(ctx, queryDeleteScopedAssignmentsTenant, keys, *tenantID)
	case "WORKSPACE":
		result, err = r.pool.Exec(ctx, queryDeleteScopedAssignmentsWorkspace, keys, *workspaceID)
	default:
		return 0, fmt.Errorf("unsupported scope type: %s", scopeType)
	}

	if err != nil {
		return 0, fmt.Errorf("deleting %s assignments: %w", scopeType, err)
	}

	return int(result.RowsAffected()), nil
}

// FindScopedAssignmentsByKeys returns a map of key -> assignmentID for assignments at the given scope.
func (r *Repository) FindScopedAssignmentsByKeys(ctx context.Context, keys []string, scopeType string, tenantID *string, workspaceID *string) (map[string]string, error) {
	if len(keys) == 0 {
		return make(map[string]string), nil
	}

	var rows pgx.Rows
	var err error

	switch scopeType {
	case "PUBLIC":
		rows, err = r.pool.Query(ctx, queryFindScopedAssignmentsByKeysPublic, keys)
	case "TENANT":
		rows, err = r.pool.Query(ctx, queryFindScopedAssignmentsByKeysTenant, keys, *tenantID)
	case "WORKSPACE":
		rows, err = r.pool.Query(ctx, queryFindScopedAssignmentsByKeysWorkspace, keys, *workspaceID)
	default:
		return nil, fmt.Errorf("unsupported scope type: %s", scopeType)
	}

	if err != nil {
		return nil, fmt.Errorf("querying %s assignments by keys: %w", scopeType, err)
	}
	defer rows.Close()

	result := make(map[string]string)
	for rows.Next() {
		var key, id string
		if err := rows.Scan(&key, &id); err != nil {
			return nil, fmt.Errorf("scanning %s assignment: %w", scopeType, err)
		}
		result[key] = id
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating %s assignments: %w", scopeType, err)
	}

	return result, nil
}
