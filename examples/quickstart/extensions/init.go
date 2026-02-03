package extensions

import (
	"context"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleInit runs once before all injectors on each render request.
func ExampleInit() sdk.InitFunc {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
		// Load shared data here (e.g., from CRM, config service)
		return nil, nil
	}
}
