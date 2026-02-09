package extensions

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// ExampleInit returns an InitFunc that runs once before all injectors on each render request.
// Use this to load shared data (e.g., from headers or an external source) that multiple injectors need.
func ExampleInit() port.InitFunc {
	return func(_ context.Context, _ *entity.InjectorContext) (any, error) {
		return nil, nil
	}
}
