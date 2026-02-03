package injectable

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// InjectableUseCase defines the input port for injectable definition operations.
// Note: Injectables are read-only - they are managed via database migrations/seeds.
type InjectableUseCase interface {
	// GetInjectable retrieves an injectable definition by ID.
	GetInjectable(ctx context.Context, id string) (*entity.InjectableDefinition, error)

	// ListInjectables lists all injectable definitions for a workspace (including global and system).
	ListInjectables(ctx context.Context, workspaceID string) ([]*entity.InjectableDefinition, error)

	// GetGroups returns all groups translated to the specified locale.
	GetGroups(locale string) []port.GroupConfig
}
