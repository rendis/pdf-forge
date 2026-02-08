package extensions

import (
	"context"
	"encoding/json"

	"github.com/rendis/pdf-forge/internal/core/port"
)

// TetherMapper parses incoming render requests.
type TetherMapper struct{}

func (m *TetherMapper) Map(ctx context.Context, mapCtx *port.MapperContext) (any, error) {
	var payload map[string]any
	if err := json.Unmarshal(mapCtx.RawBody, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}
