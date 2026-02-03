package port

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity"
)

// SystemInjectableRepository defines the interface for system injectable data access.
// System injectables are code-defined injectors whose availability is controlled via database.
type SystemInjectableRepository interface {
	// FindActiveKeysForWorkspace returns the keys of system injectables that are active
	// for a given workspace. Respects priority: WORKSPACE > TENANT > PUBLIC.
	// Both the definition and assignment must be active (is_active = true).
	FindActiveKeysForWorkspace(ctx context.Context, workspaceID string) ([]string, error)

	// FindAllDefinitions returns a map of all definition keys to their is_active status.
	FindAllDefinitions(ctx context.Context) (map[string]bool, error)

	// UpsertDefinition creates or updates a system injectable definition.
	// If the key doesn't exist, creates it. If it exists, updates is_active.
	UpsertDefinition(ctx context.Context, key string, isActive bool) error

	// FindAssignmentsByKey returns all assignments for a given injectable key.
	FindAssignmentsByKey(ctx context.Context, key string) ([]*entity.SystemInjectableAssignment, error)

	// CreateAssignment creates a new assignment.
	CreateAssignment(ctx context.Context, assignment *entity.SystemInjectableAssignment) error

	// DeleteAssignment removes an assignment by ID.
	DeleteAssignment(ctx context.Context, id string) error

	// SetAssignmentActive updates the is_active flag for an assignment.
	SetAssignmentActive(ctx context.Context, id string, isActive bool) error

	// FindPublicActiveKeys returns a set of injectable keys that have an active PUBLIC assignment.
	FindPublicActiveKeys(ctx context.Context) (map[string]bool, error)

	// BulkUpsertDefinitions creates or updates definitions for multiple keys with the given is_active status.
	BulkUpsertDefinitions(ctx context.Context, keys []string, isActive bool) error

	// CreateScopedAssignments creates assignments for multiple keys at the given scope.
	// Uses ON CONFLICT DO NOTHING for idempotency. Returns number created.
	CreateScopedAssignments(ctx context.Context, keys []string, scopeType string, tenantID *string, workspaceID *string) (int, error)

	// DeleteScopedAssignments deletes assignments for multiple keys at the given scope.
	// Returns number deleted.
	DeleteScopedAssignments(ctx context.Context, keys []string, scopeType string, tenantID *string, workspaceID *string) (int, error)

	// FindScopedAssignmentsByKeys returns a map of key -> assignmentID for assignments at the given scope.
	FindScopedAssignmentsByKeys(ctx context.Context, keys []string, scopeType string, tenantID *string, workspaceID *string) (map[string]string, error)
}
