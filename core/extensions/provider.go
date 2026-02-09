package extensions

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// ExampleWorkspaceProvider implements port.WorkspaceInjectableProvider.
// Replace this with your own logic to provide dynamic, workspace-specific injectables
// (e.g., from an external database or API).
type ExampleWorkspaceProvider struct{}

// GetInjectables returns available injectables for a workspace.
// Called when the editor opens to populate the injectable list.
func (p *ExampleWorkspaceProvider) GetInjectables(_ context.Context, _ *entity.InjectorContext) (*port.GetInjectablesResult, error) {
	return &port.GetInjectablesResult{}, nil
}

// ResolveInjectables resolves a batch of injectable codes during render.
func (p *ExampleWorkspaceProvider) ResolveInjectables(_ context.Context, _ *port.ResolveInjectablesRequest) (*port.ResolveInjectablesResult, error) {
	return &port.ResolveInjectablesResult{
		Values: make(map[string]*entity.InjectableValue),
	}, nil
}
