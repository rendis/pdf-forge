package extensions

import (
	"context"
	"encoding/json"

	"github.com/rendis/pdf-forge/internal/core/port"
)

// ExampleMapper implements port.RequestMapper.
// Parses the raw render request body as a JSON object.
// Replace this with your own parsing logic if your payload has a different structure.
type ExampleMapper struct{}

func (m *ExampleMapper) Map(_ context.Context, mapCtx *port.MapperContext) (any, error) {
	var payload map[string]any
	if err := json.Unmarshal(mapCtx.RawBody, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}
