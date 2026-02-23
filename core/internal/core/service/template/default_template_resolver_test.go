package template

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

type stubTemplateVersionSearchAdapter struct {
	responses map[string][]port.TemplateVersionSearchItem
	errors    map[string]error
}

func (s *stubTemplateVersionSearchAdapter) SearchTemplateVersions(_ context.Context, params port.TemplateVersionSearchParams) ([]port.TemplateVersionSearchItem, error) {
	workspaceCode := ""
	if len(params.WorkspaceCodes) > 0 {
		workspaceCode = params.WorkspaceCodes[0]
	}
	key := fmt.Sprintf("%s|%s|%s", params.TenantCode, workspaceCode, params.DocumentType)
	if err, ok := s.errors[key]; ok {
		return nil, err
	}
	return s.responses[key], nil
}

func TestDefaultTemplateResolver_Resolve(t *testing.T) {
	resolver := NewDefaultTemplateResolver()
	req := &port.TemplateResolverRequest{
		TenantCode:    "TENANT_A",
		WorkspaceCode: "CLIENT_WS",
		DocumentType:  "CONTRACT",
	}

	t.Run("level 1 hit", func(t *testing.T) {
		adapter := &stubTemplateVersionSearchAdapter{
			responses: map[string][]port.TemplateVersionSearchItem{
				"TENANT_A|CLIENT_WS|CONTRACT": {{VersionID: "v-level-1", Published: true}},
			},
		}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-level-1", *versionID)
	})

	t.Run("level 2 fallback hit", func(t *testing.T) {
		adapter := &stubTemplateVersionSearchAdapter{
			responses: map[string][]port.TemplateVersionSearchItem{
				"TENANT_A|SYS_WRKSP|CONTRACT": {{VersionID: "v-level-2", Published: true}},
			},
		}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-level-2", *versionID)
	})

	t.Run("level 3 fallback hit", func(t *testing.T) {
		adapter := &stubTemplateVersionSearchAdapter{
			responses: map[string][]port.TemplateVersionSearchItem{
				"SYS|SYS_WRKSP|CONTRACT": {{VersionID: "v-level-3", Published: true}},
			},
		}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-level-3", *versionID)
	})

	t.Run("not found", func(t *testing.T) {
		adapter := &stubTemplateVersionSearchAdapter{responses: map[string][]port.TemplateVersionSearchItem{}}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.ErrorIs(t, err, entity.ErrTemplateNotResolved)
		assert.Nil(t, versionID)
	})

	t.Run("adapter error", func(t *testing.T) {
		expectedErr := errors.New("db failed")
		adapter := &stubTemplateVersionSearchAdapter{
			errors: map[string]error{
				"TENANT_A|CLIENT_WS|CONTRACT": expectedErr,
			},
		}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.Error(t, err)
		assert.ErrorContains(t, err, "default template resolution failed at stage tenant_workspace")
		assert.ErrorContains(t, err, "db failed")
		assert.Nil(t, versionID)
	})
}
