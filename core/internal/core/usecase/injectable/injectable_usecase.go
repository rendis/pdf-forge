package injectable

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// ListInjectablesRequest contains parameters for listing injectables.
type ListInjectablesRequest struct {
	WorkspaceID string // Workspace ID to list injectables for
	Locale      string // Locale for translations (e.g., "es", "en")
}

// ListInjectablesResult contains the list of injectables and groups.
type ListInjectablesResult struct {
	Injectables []*entity.InjectableDefinition
	Groups      []port.GroupConfig
}

// InjectableUseCase defines the input port for injectable definition operations.
// Note: Injectables are read-only - they are managed via database migrations/seeds.
type InjectableUseCase interface {
	// GetInjectable retrieves an injectable definition by ID.
	GetInjectable(ctx context.Context, id string) (*entity.InjectableDefinition, error)

	// ListInjectables lists all injectable definitions for a workspace (including global, system, and provider).
	ListInjectables(ctx context.Context, req *ListInjectablesRequest) (*ListInjectablesResult, error)
}
