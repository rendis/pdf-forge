package extensions

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// TetherInit runs once before all injectors on each render request.
func TetherInit() port.InitFunc {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (any, error) {
		return nil, nil
	}
}
