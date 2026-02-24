package template

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_Validation(t *testing.T) {
	adapter := &TemplateVersionSearchAdapter{}

	_, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{})
	require.Error(t, err)
	assert.ErrorContains(t, err, "tenantCode is required")

	_, err = adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode: "TENANT_A",
	})
	require.Error(t, err)
	assert.ErrorContains(t, err, "workspaceCodes is required")

	_, err = adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS"},
	})
	require.Error(t, err)
	assert.ErrorContains(t, err, "documentType is required")
}

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_TenantNotFound(t *testing.T) {
	adapter := &TemplateVersionSearchAdapter{
		tenantRepo: &templateResolverTenantRepoStub{
			findByCodeErr: map[string]error{"TENANT_A": entity.ErrTenantNotFound},
		},
	}

	items, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "tenant_a",
		WorkspaceCodes: []string{"ws_1"},
		DocumentType:   "contract",
	})
	require.NoError(t, err)
	assert.Empty(t, items)
}

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_WorkspaceNotFoundIsSkipped(t *testing.T) {
	tenant := &entity.Tenant{ID: "tenant-1", Code: "TENANT_A"}
	docType := &entity.DocumentType{ID: "doc-1", Code: "CONTRACT"}
	template := &entity.Template{ID: "tpl-1", DocumentTypeID: &docType.ID}

	adapter := &TemplateVersionSearchAdapter{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": tenant},
		},
		workspaceRepo: &templateResolverWorkspaceRepoStub{
			findByCodeAndTenantErr: map[string]error{
				"tenant-1|WS_MISSING": entity.ErrWorkspaceNotFound,
			},
			byCodeAndTenant: map[string]*entity.Workspace{
				"tenant-1|WS_OK": {ID: "ws-1", Code: "WS_OK"},
			},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{"tenant-1|CONTRACT": docType},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byDocumentType: map[string]*entity.Template{"ws-1|doc-1": template},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			publishedByTemplate: map[string]*entity.TemplateVersionWithDetails{
				"tpl-1": {
					TemplateVersion: entity.TemplateVersion{ID: "v-published", Status: entity.VersionStatusPublished},
				},
			},
		},
	}

	items, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS_MISSING", "WS_OK"},
		DocumentType:   "CONTRACT",
	})
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "v-published", items[0].VersionID)
	assert.Equal(t, "WS_OK", items[0].WorkspaceCode)
}

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_DocumentTypeNotFound(t *testing.T) {
	tenant := &entity.Tenant{ID: "tenant-1", Code: "TENANT_A"}
	adapter := &TemplateVersionSearchAdapter{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": tenant},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			findByCodeWithGlobalFallbackErr: map[string]error{"tenant-1|CONTRACT": entity.ErrDocumentTypeNotFound},
		},
	}

	items, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS_1"},
		DocumentType:   "CONTRACT",
	})
	require.NoError(t, err)
	assert.Empty(t, items)
}

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_PublishedFilter(t *testing.T) {
	tenant := &entity.Tenant{ID: "tenant-1", Code: "TENANT_A"}
	docType := &entity.DocumentType{ID: "doc-1", Code: "CONTRACT"}
	template := &entity.Template{ID: "tpl-1", DocumentTypeID: &docType.ID}
	ws := &entity.Workspace{ID: "ws-1", Code: "WS_1"}

	adapter := &TemplateVersionSearchAdapter{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": tenant},
		},
		workspaceRepo: &templateResolverWorkspaceRepoStub{
			byCodeAndTenant: map[string]*entity.Workspace{"tenant-1|WS_1": ws},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{"tenant-1|CONTRACT": docType},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byDocumentType: map[string]*entity.Template{"ws-1|doc-1": template},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			publishedByTemplate: map[string]*entity.TemplateVersionWithDetails{
				"tpl-1": {
					TemplateVersion: entity.TemplateVersion{ID: "v-published", Status: entity.VersionStatusPublished},
				},
			},
		},
	}

	published := true
	items, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS_1"},
		DocumentType:   "CONTRACT",
		Published:      &published,
	})
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.True(t, items[0].Published)
	assert.Equal(t, "v-published", items[0].VersionID)
}

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_NonPublishedFilter(t *testing.T) {
	tenant := &entity.Tenant{ID: "tenant-1", Code: "TENANT_A"}
	docType := &entity.DocumentType{ID: "doc-1", Code: "CONTRACT"}
	template := &entity.Template{ID: "tpl-1", DocumentTypeID: &docType.ID}
	ws := &entity.Workspace{ID: "ws-1", Code: "WS_1"}

	adapter := &TemplateVersionSearchAdapter{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": tenant},
		},
		workspaceRepo: &templateResolverWorkspaceRepoStub{
			byCodeAndTenant: map[string]*entity.Workspace{"tenant-1|WS_1": ws},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{"tenant-1|CONTRACT": docType},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byDocumentType: map[string]*entity.Template{"ws-1|doc-1": template},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			versionsByTemplate: map[string][]*entity.TemplateVersion{
				"tpl-1": {
					{ID: "v-draft", Status: entity.VersionStatusDraft},
					{ID: "v-published", Status: entity.VersionStatusPublished},
					{ID: "v-archived", Status: entity.VersionStatusArchived},
				},
			},
		},
	}

	published := false
	items, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS_1"},
		DocumentType:   "CONTRACT",
		Published:      &published,
	})
	require.NoError(t, err)
	require.Len(t, items, 2)
	assert.Equal(t, "v-draft", items[0].VersionID)
	assert.Equal(t, "v-archived", items[1].VersionID)
}

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_StagingFilter(t *testing.T) {
	tenant := &entity.Tenant{ID: "tenant-1", Code: "TENANT_A"}
	docType := &entity.DocumentType{ID: "doc-1", Code: "CONTRACT"}
	template := &entity.Template{ID: "tpl-1", DocumentTypeID: &docType.ID}
	ws := &entity.Workspace{ID: "ws-1", Code: "WS_1"}

	adapter := &TemplateVersionSearchAdapter{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": tenant},
		},
		workspaceRepo: &templateResolverWorkspaceRepoStub{
			byCodeAndTenant: map[string]*entity.Workspace{"tenant-1|WS_1": ws},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{"tenant-1|CONTRACT": docType},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byDocumentType: map[string]*entity.Template{"ws-1|doc-1": template},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			stagingByTemplate: map[string]*entity.TemplateVersionWithDetails{
				"tpl-1": {
					TemplateVersion: entity.TemplateVersion{ID: "v-staging", Status: entity.VersionStatusStaging},
				},
			},
		},
	}

	staging := true
	items, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS_1"},
		DocumentType:   "CONTRACT",
		Staging:        &staging,
	})
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "v-staging", items[0].VersionID)
}

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_StagingNotFound(t *testing.T) {
	tenant := &entity.Tenant{ID: "tenant-1", Code: "TENANT_A"}
	docType := &entity.DocumentType{ID: "doc-1", Code: "CONTRACT"}
	template := &entity.Template{ID: "tpl-1", DocumentTypeID: &docType.ID}
	ws := &entity.Workspace{ID: "ws-1", Code: "WS_1"}

	adapter := &TemplateVersionSearchAdapter{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": tenant},
		},
		workspaceRepo: &templateResolverWorkspaceRepoStub{
			byCodeAndTenant: map[string]*entity.Workspace{"tenant-1|WS_1": ws},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{"tenant-1|CONTRACT": docType},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byDocumentType: map[string]*entity.Template{"ws-1|doc-1": template},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			// No staging version configured
		},
	}

	staging := true
	items, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS_1"},
		DocumentType:   "CONTRACT",
		Staging:        &staging,
	})
	require.NoError(t, err)
	assert.Empty(t, items, "should return empty when no staging version exists")
}

func TestTemplateVersionSearchAdapter_SearchTemplateVersions_StagingPreferredOverPublished(t *testing.T) {
	tenant := &entity.Tenant{ID: "tenant-1", Code: "TENANT_A"}
	docType := &entity.DocumentType{ID: "doc-1", Code: "CONTRACT"}
	template := &entity.Template{ID: "tpl-1", DocumentTypeID: &docType.ID}
	ws := &entity.Workspace{ID: "ws-1", Code: "WS_1"}

	adapter := &TemplateVersionSearchAdapter{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": tenant},
		},
		workspaceRepo: &templateResolverWorkspaceRepoStub{
			byCodeAndTenant: map[string]*entity.Workspace{"tenant-1|WS_1": ws},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{"tenant-1|CONTRACT": docType},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byDocumentType: map[string]*entity.Template{"ws-1|doc-1": template},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			stagingByTemplate: map[string]*entity.TemplateVersionWithDetails{
				"tpl-1": {
					TemplateVersion: entity.TemplateVersion{ID: "v-staging", Status: entity.VersionStatusStaging},
				},
			},
			publishedByTemplate: map[string]*entity.TemplateVersionWithDetails{
				"tpl-1": {
					TemplateVersion: entity.TemplateVersion{ID: "v-published", Status: entity.VersionStatusPublished},
				},
			},
		},
	}

	// When requesting staging, should get staging (not published)
	staging := true
	items, err := adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS_1"},
		DocumentType:   "CONTRACT",
		Staging:        &staging,
	})
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "v-staging", items[0].VersionID, "staging filter should return staging version")

	// When requesting published, should get published (not staging)
	published := true
	items, err = adapter.SearchTemplateVersions(context.Background(), port.TemplateVersionSearchParams{
		TenantCode:     "TENANT_A",
		WorkspaceCodes: []string{"WS_1"},
		DocumentType:   "CONTRACT",
		Published:      &published,
	})
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "v-published", items[0].VersionID, "published filter should return published version")
}

type templateResolverTenantRepoStub struct {
	byCode        map[string]*entity.Tenant
	findByCodeErr map[string]error
}

func (s *templateResolverTenantRepoStub) FindByCode(_ context.Context, code string) (*entity.Tenant, error) {
	if err := s.findByCodeErr[code]; err != nil {
		return nil, err
	}
	if tenant, ok := s.byCode[code]; ok {
		return tenant, nil
	}
	return nil, entity.ErrTenantNotFound
}

func (s *templateResolverTenantRepoStub) FindSystemTenant(_ context.Context) (*entity.Tenant, error) {
	return nil, entity.ErrTenantNotFound
}

type templateResolverWorkspaceRepoStub struct {
	byCodeAndTenant        map[string]*entity.Workspace
	findByCodeAndTenantErr map[string]error
}

func (s *templateResolverWorkspaceRepoStub) FindByCodeAndTenant(_ context.Context, tenantID, code string) (*entity.Workspace, error) {
	key := tenantID + "|" + code
	if err := s.findByCodeAndTenantErr[key]; err != nil {
		return nil, err
	}
	if ws, ok := s.byCodeAndTenant[key]; ok {
		return ws, nil
	}
	return nil, entity.ErrWorkspaceNotFound
}

func (s *templateResolverWorkspaceRepoStub) FindSystemByTenant(_ context.Context, _ *string) (*entity.Workspace, error) {
	return nil, entity.ErrWorkspaceNotFound
}

type templateResolverDocumentTypeRepoStub struct {
	byCodeWithGlobalFallback        map[string]*entity.DocumentType
	findByCodeWithGlobalFallbackErr map[string]error
}

func (s *templateResolverDocumentTypeRepoStub) FindByCodeWithGlobalFallback(_ context.Context, tenantID, code string) (*entity.DocumentType, error) {
	key := tenantID + "|" + code
	if err := s.findByCodeWithGlobalFallbackErr[key]; err != nil {
		return nil, err
	}
	if docType, ok := s.byCodeWithGlobalFallback[key]; ok {
		return docType, nil
	}
	return nil, entity.ErrDocumentTypeNotFound
}

type templateResolverTemplateRepoStub struct {
	byDocumentType map[string]*entity.Template
	byID           map[string]*entity.Template
}

func (s *templateResolverTemplateRepoStub) FindByDocumentType(_ context.Context, workspaceID, documentTypeID string) (*entity.Template, error) {
	key := workspaceID + "|" + documentTypeID
	if tmpl, ok := s.byDocumentType[key]; ok {
		return tmpl, nil
	}
	return nil, nil
}

func (s *templateResolverTemplateRepoStub) FindByID(_ context.Context, id string) (*entity.Template, error) {
	if tmpl, ok := s.byID[id]; ok {
		return tmpl, nil
	}
	return nil, entity.ErrTemplateNotFound
}

type templateResolverTemplateVersionRepoStub struct {
	publishedByTemplate    map[string]*entity.TemplateVersionWithDetails
	publishedByTemplateErr map[string]error
	stagingByTemplate      map[string]*entity.TemplateVersionWithDetails
	stagingByTemplateErr   map[string]error
	versionsByTemplate     map[string][]*entity.TemplateVersion
	byID                   map[string]*entity.TemplateVersionWithDetails
	byIDErr                map[string]error
}

func (s *templateResolverTemplateVersionRepoStub) FindPublishedByTemplateIDWithDetails(_ context.Context, templateID string) (*entity.TemplateVersionWithDetails, error) {
	if err := s.publishedByTemplateErr[templateID]; err != nil {
		return nil, err
	}
	if version, ok := s.publishedByTemplate[templateID]; ok {
		return version, nil
	}
	return nil, entity.ErrNoPublishedVersion
}

func (s *templateResolverTemplateVersionRepoStub) FindStagingByTemplateIDWithDetails(_ context.Context, templateID string) (*entity.TemplateVersionWithDetails, error) {
	if s.stagingByTemplateErr != nil {
		if err := s.stagingByTemplateErr[templateID]; err != nil {
			return nil, err
		}
	}
	if s.stagingByTemplate != nil {
		if version, ok := s.stagingByTemplate[templateID]; ok {
			return version, nil
		}
	}
	return nil, entity.ErrVersionNotFound
}

func (s *templateResolverTemplateVersionRepoStub) FindByIDWithDetails(_ context.Context, id string) (*entity.TemplateVersionWithDetails, error) {
	if err := s.byIDErr[id]; err != nil {
		return nil, err
	}
	if version, ok := s.byID[id]; ok {
		return version, nil
	}
	return nil, entity.ErrVersionNotFound
}

func (s *templateResolverTemplateVersionRepoStub) FindByTemplateID(_ context.Context, templateID string) ([]*entity.TemplateVersion, error) {
	if versions, ok := s.versionsByTemplate[templateID]; ok {
		return versions, nil
	}
	return nil, errors.New("template not configured")
}
