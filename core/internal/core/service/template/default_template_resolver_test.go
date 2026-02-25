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

	results := s.collectResponses(key)

	if params.IncludeTenantSystemWorkspace {
		sysKey := fmt.Sprintf("%s|%s_SYS|%s", params.TenantCode, params.TenantCode, params.DocumentType)
		results = append(results, s.collectResponses(sysKey)...)
	}

	return results, nil
}

func (s *stubTemplateVersionSearchAdapter) collectResponses(key string) []port.TemplateVersionSearchItem {
	if items, ok := s.responses[key]; ok {
		return items
	}
	return nil
}

func TestDefaultTemplateResolver_StagingMode(t *testing.T) {
	resolver := NewDefaultTemplateResolver()

	t.Run("staging mode prefers staging over published at same level", func(t *testing.T) {
		adapter := &stubTemplateVersionSearchAdapter{
			responses: map[string][]port.TemplateVersionSearchItem{
				"TENANT_A|CLIENT_WS|CONTRACT": {{VersionID: "v-staging", Published: false}},
			},
		}

		req := &port.TemplateResolverRequest{
			TenantCode:    "TENANT_A",
			WorkspaceCode: "CLIENT_WS",
			DocumentType:  "CONTRACT",
			Environment:   entity.EnvironmentDev,
		}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-staging", *versionID)
	})

	t.Run("staging mode falls back to published when no staging exists", func(t *testing.T) {
		customAdapter := &stagingAwareSearchAdapter{
			stagingResponses: map[string][]port.TemplateVersionSearchItem{},
			publishedResponses: map[string][]port.TemplateVersionSearchItem{
				"TENANT_A|CLIENT_WS|CONTRACT": {{VersionID: "v-published", Published: true}},
			},
		}

		req := &port.TemplateResolverRequest{
			TenantCode:    "TENANT_A",
			WorkspaceCode: "CLIENT_WS",
			DocumentType:  "CONTRACT",
			Environment:   entity.EnvironmentDev,
		}

		versionID, err := resolver.Resolve(context.Background(), req, customAdapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-published", *versionID)
	})

	t.Run("staging mode falls back to global system", func(t *testing.T) {
		customAdapter := &stagingAwareSearchAdapter{
			stagingResponses: map[string][]port.TemplateVersionSearchItem{
				"SYS|SYS_WRKSP|CONTRACT": {{VersionID: "v-sys-staging"}},
			},
			publishedResponses: map[string][]port.TemplateVersionSearchItem{},
		}

		req := &port.TemplateResolverRequest{
			TenantCode:    "TENANT_A",
			WorkspaceCode: "CLIENT_WS",
			DocumentType:  "CONTRACT",
			Environment:   entity.EnvironmentDev,
		}

		versionID, err := resolver.Resolve(context.Background(), req, customAdapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-sys-staging", *versionID)
	})

	t.Run("non-staging mode ignores staging versions", func(t *testing.T) {
		customAdapter := &stagingAwareSearchAdapter{
			stagingResponses: map[string][]port.TemplateVersionSearchItem{
				"TENANT_A|CLIENT_WS|CONTRACT": {{VersionID: "v-staging"}},
			},
			publishedResponses: map[string][]port.TemplateVersionSearchItem{
				"TENANT_A|CLIENT_WS|CONTRACT": {{VersionID: "v-published", Published: true}},
			},
		}

		req := &port.TemplateResolverRequest{
			TenantCode:    "TENANT_A",
			WorkspaceCode: "CLIENT_WS",
			DocumentType:  "CONTRACT",
			Environment:   entity.EnvironmentProd, // NOT dev environment
		}

		versionID, err := resolver.Resolve(context.Background(), req, customAdapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-published", *versionID, "should use published, not staging")
	})

	t.Run("staging mode returns not resolved when nothing found", func(t *testing.T) {
		customAdapter := &stagingAwareSearchAdapter{
			stagingResponses:   map[string][]port.TemplateVersionSearchItem{},
			publishedResponses: map[string][]port.TemplateVersionSearchItem{},
		}

		req := &port.TemplateResolverRequest{
			TenantCode:    "TENANT_A",
			WorkspaceCode: "CLIENT_WS",
			DocumentType:  "CONTRACT",
			Environment:   entity.EnvironmentDev,
		}

		versionID, err := resolver.Resolve(context.Background(), req, customAdapter)
		require.ErrorIs(t, err, entity.ErrTemplateNotResolved)
		assert.Nil(t, versionID)
	})

	t.Run("staging search error propagates", func(t *testing.T) {
		dbErr := errors.New("db timeout")
		customAdapter := &stagingAwareSearchAdapter{
			stagingErrors: map[string]error{
				"TENANT_A|CLIENT_WS|CONTRACT": dbErr,
			},
		}

		req := &port.TemplateResolverRequest{
			TenantCode:    "TENANT_A",
			WorkspaceCode: "CLIENT_WS",
			DocumentType:  "CONTRACT",
			Environment:   entity.EnvironmentDev,
		}

		versionID, err := resolver.Resolve(context.Background(), req, customAdapter)
		require.Error(t, err)
		assert.ErrorContains(t, err, "db timeout")
		assert.Nil(t, versionID)
	})
}

// stagingAwareSearchAdapter differentiates staging vs published searches.
type stagingAwareSearchAdapter struct {
	stagingResponses   map[string][]port.TemplateVersionSearchItem
	publishedResponses map[string][]port.TemplateVersionSearchItem
	stagingErrors      map[string]error
	publishedErrors    map[string]error
}

func (s *stagingAwareSearchAdapter) SearchTemplateVersions(_ context.Context, params port.TemplateVersionSearchParams) ([]port.TemplateVersionSearchItem, error) {
	workspaceCode := ""
	if len(params.WorkspaceCodes) > 0 {
		workspaceCode = params.WorkspaceCodes[0]
	}
	key := fmt.Sprintf("%s|%s|%s", params.TenantCode, workspaceCode, params.DocumentType)

	isStaging := params.Staging != nil && *params.Staging
	errs := s.publishedErrors
	responses := s.publishedResponses
	if isStaging {
		errs = s.stagingErrors
		responses = s.stagingResponses
	}

	if err, ok := errs[key]; ok {
		return nil, err
	}
	return responses[key], nil
}

func TestDefaultTemplateResolver_Resolve(t *testing.T) {
	resolver := NewDefaultTemplateResolver()
	req := &port.TemplateResolverRequest{
		TenantCode:    "TENANT_A",
		WorkspaceCode: "CLIENT_WS",
		DocumentType:  "CONTRACT",
	}

	t.Run("level 1 hit — exact workspace", func(t *testing.T) {
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

	t.Run("level 1 fallback — tenant system workspace via flag", func(t *testing.T) {
		adapter := &stubTemplateVersionSearchAdapter{
			responses: map[string][]port.TemplateVersionSearchItem{
				// No match for CLIENT_WS, but match for TENANT_A_SYS (tenant system workspace)
				"TENANT_A|TENANT_A_SYS|CONTRACT": {{VersionID: "v-tenant-sys", Published: true, WorkspaceCode: "TENANT_A_SYS"}},
			},
		}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-tenant-sys", *versionID)
	})

	t.Run("level 1 exact workspace takes priority over tenant sys", func(t *testing.T) {
		adapter := &stubTemplateVersionSearchAdapter{
			responses: map[string][]port.TemplateVersionSearchItem{
				"TENANT_A|CLIENT_WS|CONTRACT":    {{VersionID: "v-exact", Published: true}},
				"TENANT_A|TENANT_A_SYS|CONTRACT": {{VersionID: "v-tenant-sys", Published: true}},
			},
		}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-exact", *versionID, "exact workspace should take priority over tenant sys")
	})

	t.Run("level 2 fallback — global system", func(t *testing.T) {
		adapter := &stubTemplateVersionSearchAdapter{
			responses: map[string][]port.TemplateVersionSearchItem{
				"SYS|SYS_WRKSP|CONTRACT": {{VersionID: "v-global-sys", Published: true}},
			},
		}

		versionID, err := resolver.Resolve(context.Background(), req, adapter)
		require.NoError(t, err)
		require.NotNil(t, versionID)
		assert.Equal(t, "v-global-sys", *versionID)
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
