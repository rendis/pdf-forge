package template

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
	"github.com/rendis/pdf-forge/core/internal/core/port"
	templateuc "github.com/rendis/pdf-forge/core/internal/core/usecase/template"
)

func TestInternalRenderService_CustomResolverVersionHit(t *testing.T) {
	content := mustBuildPortableDoc(t)

	customResolver := &templateResolverStub{versionID: strPtr("v-custom")}
	defaultResolver := &templateResolverStub{versionID: strPtr("v-default")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": {ID: "tenant-1", Code: "TENANT_A"}},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{
				"tenant-1|CONTRACT": {ID: "doc-1", Code: "CONTRACT"},
			},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byID: map[string]*entity.Template{
				"tpl-1": {ID: "tpl-1", DocumentTypeID: strPtr("doc-1")},
			},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-custom": {
					TemplateVersion: entity.TemplateVersion{
						ID:               "v-custom",
						TemplateID:       "tpl-1",
						Status:           entity.VersionStatusPublished,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     renderer,
		customResolver:  customResolver,
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
		Injectables:      map[string]any{"foo": "bar"},
		Payload:          map[string]any{"foo": "bar"},
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 1, customResolver.calls)
	assert.Equal(t, 0, defaultResolver.calls)
	assert.Equal(t, 1, renderer.calls)
}

func TestInternalRenderService_CustomResolverNilFallsBackToDefault(t *testing.T) {
	content := mustBuildPortableDoc(t)

	customResolver := &templateResolverStub{versionID: nil}
	defaultResolver := &templateResolverStub{versionID: strPtr("v-default")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-default": {
					TemplateVersion: entity.TemplateVersion{
						ID:               "v-default",
						TemplateID:       "tpl-1",
						Status:           entity.VersionStatusPublished,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     renderer,
		customResolver:  customResolver,
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 1, customResolver.calls)
	assert.Equal(t, 1, defaultResolver.calls)
	assert.Equal(t, 1, renderer.calls)
}

func TestInternalRenderService_CustomResolverErrorAborts(t *testing.T) {
	customResolver := &templateResolverStub{err: errors.New("resolver exploded")}
	defaultResolver := &templateResolverStub{versionID: strPtr("v-default")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		pdfRenderer:     renderer,
		customResolver:  customResolver,
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
	})
	require.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorContains(t, err, "custom template resolver failed")
	assert.Equal(t, 1, customResolver.calls)
	assert.Equal(t, 0, defaultResolver.calls)
	assert.Equal(t, 0, renderer.calls)
}

func TestInternalRenderService_CustomResolverRejectsNonPublishedVersion(t *testing.T) {
	content := mustBuildPortableDoc(t)
	customResolver := &templateResolverStub{versionID: strPtr("v-draft")}

	service := &InternalRenderService{
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-draft": {
					TemplateVersion: entity.TemplateVersion{
						ID:               "v-draft",
						TemplateID:       "tpl-1",
						Status:           entity.VersionStatusDraft,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     &pdfRendererStub{},
		customResolver:  customResolver,
		defaultResolver: &templateResolverStub{versionID: strPtr("v-default")},
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
	})
	require.ErrorIs(t, err, entity.ErrTemplateNotResolved)
	assert.Nil(t, result)
}

func TestInternalRenderService_CustomResolverRejectsMismatchedDocumentType(t *testing.T) {
	content := mustBuildPortableDoc(t)
	customResolver := &templateResolverStub{versionID: strPtr("v-custom")}

	service := &InternalRenderService{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": {ID: "tenant-1", Code: "TENANT_A"}},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{
				"tenant-1|CONTRACT": {ID: "doc-1", Code: "CONTRACT"},
			},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byID: map[string]*entity.Template{
				"tpl-1": {ID: "tpl-1", DocumentTypeID: strPtr("doc-other")},
			},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-custom": {
					TemplateVersion: entity.TemplateVersion{
						ID:               "v-custom",
						TemplateID:       "tpl-1",
						Status:           entity.VersionStatusPublished,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     &pdfRendererStub{},
		customResolver:  customResolver,
		defaultResolver: &templateResolverStub{versionID: strPtr("v-default")},
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
	})
	require.ErrorIs(t, err, entity.ErrTemplateNotResolved)
	assert.Nil(t, result)
}

func TestInternalRenderService_WithoutCustomResolverUsesDefaultFlow(t *testing.T) {
	content := mustBuildPortableDoc(t)
	defaultResolver := &templateResolverStub{versionID: strPtr("v-default")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-default": {
					TemplateVersion: entity.TemplateVersion{
						ID:               "v-default",
						TemplateID:       "tpl-1",
						Status:           entity.VersionStatusPublished,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     renderer,
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 1, defaultResolver.calls)
	assert.Equal(t, 1, renderer.calls)
}

func TestInternalRenderService_CustomResolverBypassesCacheWhenResolved(t *testing.T) {
	customContent := mustBuildPortableDocWithTitle(t, "custom-version")
	cachedContent := mustBuildPortableDocWithTitle(t, "cached-version")

	cachedVersion := &entity.TemplateVersionWithDetails{
		TemplateVersion: entity.TemplateVersion{
			ID:               "v-cached",
			TemplateID:       "tpl-1",
			Status:           entity.VersionStatusPublished,
			ContentStructure: cachedContent,
		},
	}
	cache := &templateCacheStub{
		items: map[string]*entity.TemplateVersionWithDetails{
			"TENANT_A:WS_1:CONTRACT": cachedVersion,
		},
	}

	customResolver := &templateResolverStub{versionID: strPtr("v-custom")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": {ID: "tenant-1", Code: "TENANT_A"}},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{
				"tenant-1|CONTRACT": {ID: "doc-1", Code: "CONTRACT"},
			},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byID: map[string]*entity.Template{
				"tpl-1": {ID: "tpl-1", DocumentTypeID: strPtr("doc-1")},
			},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-custom": {
					TemplateVersion: entity.TemplateVersion{
						ID:               "v-custom",
						TemplateID:       "tpl-1",
						Status:           entity.VersionStatusPublished,
						ContentStructure: customContent,
					},
				},
			},
		},
		pdfRenderer:     renderer,
		templateCache:   cache,
		customResolver:  customResolver,
		defaultResolver: &templateResolverStub{versionID: strPtr("v-default")},
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 1, customResolver.calls)
	assert.Equal(t, "custom-version", renderer.lastTitle)
	assert.Equal(t, 0, cache.getCalls)
	assert.Equal(t, 0, cache.setCalls)
}

func TestInternalRenderService_CustomResolverNilUsesCachedFallbackFlow(t *testing.T) {
	cachedContent := mustBuildPortableDocWithTitle(t, "cached-version")

	cachedVersion := &entity.TemplateVersionWithDetails{
		TemplateVersion: entity.TemplateVersion{
			ID:               "v-cached",
			TemplateID:       "tpl-1",
			Status:           entity.VersionStatusPublished,
			ContentStructure: cachedContent,
		},
	}
	cache := &templateCacheStub{
		items: map[string]*entity.TemplateVersionWithDetails{
			"TENANT_A:WS_1:CONTRACT": cachedVersion,
		},
	}

	customResolver := &templateResolverStub{versionID: nil}
	defaultResolver := &templateResolverStub{versionID: strPtr("v-default")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-default": {
					TemplateVersion: entity.TemplateVersion{
						ID:               "v-default",
						TemplateID:       "tpl-1",
						Status:           entity.VersionStatusPublished,
						ContentStructure: mustBuildPortableDocWithTitle(t, "default-version"),
					},
				},
			},
		},
		pdfRenderer:     renderer,
		templateCache:   cache,
		customResolver:  customResolver,
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 1, customResolver.calls)
	assert.Equal(t, 0, defaultResolver.calls)
	assert.Equal(t, "cached-version", renderer.lastTitle)
	assert.Equal(t, 1, cache.getCalls)
	assert.Equal(t, 0, cache.setCalls)
}

// --- Staging Mode Tests ---

func TestInternalRenderService_StagingMode_SkipsCache(t *testing.T) {
	cachedContent := mustBuildPortableDocWithTitle(t, "cached-version")
	freshContent := mustBuildPortableDocWithTitle(t, "fresh-staging")

	cache := &templateCacheStub{
		items: map[string]*entity.TemplateVersionWithDetails{
			"TENANT_A:WS_1:CONTRACT": {
				TemplateVersion: entity.TemplateVersion{
					ID: "v-cached", Status: entity.VersionStatusPublished,
					ContentStructure: cachedContent,
				},
			},
		},
	}

	defaultResolver := &templateResolverStub{versionID: strPtr("v-staging")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-staging": {
					TemplateVersion: entity.TemplateVersion{
						ID: "v-staging", TemplateID: "tpl-1",
						Status:           entity.VersionStatusStaging,
						ContentStructure: freshContent,
					},
				},
			},
		},
		pdfRenderer:     renderer,
		templateCache:   cache,
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
		StagingMode:      true,
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 0, cache.getCalls, "cache should NOT be consulted in staging mode")
	assert.Equal(t, 0, cache.setCalls, "cache should NOT be updated in staging mode")
	assert.Equal(t, "fresh-staging", renderer.lastTitle)
}

func TestInternalRenderService_StagingMode_AcceptsStagingVersion(t *testing.T) {
	content := mustBuildPortableDoc(t)
	defaultResolver := &templateResolverStub{versionID: strPtr("v-staging")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-staging": {
					TemplateVersion: entity.TemplateVersion{
						ID: "v-staging", TemplateID: "tpl-1",
						Status:           entity.VersionStatusStaging,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     renderer,
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
		StagingMode:      true,
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 1, renderer.calls)
}

func TestInternalRenderService_NonStagingMode_RejectsStagingVersion(t *testing.T) {
	content := mustBuildPortableDoc(t)
	defaultResolver := &templateResolverStub{versionID: strPtr("v-staging")}

	service := &InternalRenderService{
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-staging": {
					TemplateVersion: entity.TemplateVersion{
						ID: "v-staging", TemplateID: "tpl-1",
						Status:           entity.VersionStatusStaging,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     &pdfRendererStub{},
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
		StagingMode:      false, // NOT staging mode
	})
	require.ErrorIs(t, err, entity.ErrTemplateNotResolved)
	assert.Nil(t, result)
}

func TestInternalRenderService_StagingMode_RejectsDraftVersion(t *testing.T) {
	content := mustBuildPortableDoc(t)
	defaultResolver := &templateResolverStub{versionID: strPtr("v-draft")}

	service := &InternalRenderService{
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-draft": {
					TemplateVersion: entity.TemplateVersion{
						ID: "v-draft", TemplateID: "tpl-1",
						Status:           entity.VersionStatusDraft,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     &pdfRendererStub{},
		defaultResolver: defaultResolver,
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
		StagingMode:      true, // staging mode but version is DRAFT, not STAGING
	})
	require.ErrorIs(t, err, entity.ErrTemplateNotResolved)
	assert.Nil(t, result)
}

func TestInternalRenderService_CustomResolverAcceptsStagingInStagingMode(t *testing.T) {
	content := mustBuildPortableDoc(t)
	customResolver := &templateResolverStub{versionID: strPtr("v-staging")}
	renderer := &pdfRendererStub{}

	service := &InternalRenderService{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": {ID: "tenant-1", Code: "TENANT_A"}},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{
				"tenant-1|CONTRACT": {ID: "doc-1", Code: "CONTRACT"},
			},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byID: map[string]*entity.Template{
				"tpl-1": {ID: "tpl-1", DocumentTypeID: strPtr("doc-1")},
			},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-staging": {
					TemplateVersion: entity.TemplateVersion{
						ID: "v-staging", TemplateID: "tpl-1",
						Status:           entity.VersionStatusStaging,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     renderer,
		customResolver:  customResolver,
		defaultResolver: &templateResolverStub{},
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
		StagingMode:      true,
		Injectables:      map[string]any{},
		Payload:          map[string]any{},
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 1, renderer.calls)
}

func TestInternalRenderService_CustomResolverRejectsStagingWithoutStagingMode(t *testing.T) {
	content := mustBuildPortableDoc(t)
	customResolver := &templateResolverStub{versionID: strPtr("v-staging")}

	service := &InternalRenderService{
		tenantRepo: &templateResolverTenantRepoStub{
			byCode: map[string]*entity.Tenant{"TENANT_A": {ID: "tenant-1", Code: "TENANT_A"}},
		},
		docTypeRepo: &templateResolverDocumentTypeRepoStub{
			byCodeWithGlobalFallback: map[string]*entity.DocumentType{
				"tenant-1|CONTRACT": {ID: "doc-1", Code: "CONTRACT"},
			},
		},
		templateRepo: &templateResolverTemplateRepoStub{
			byID: map[string]*entity.Template{
				"tpl-1": {ID: "tpl-1", DocumentTypeID: strPtr("doc-1")},
			},
		},
		versionRepo: &templateResolverTemplateVersionRepoStub{
			byID: map[string]*entity.TemplateVersionWithDetails{
				"v-staging": {
					TemplateVersion: entity.TemplateVersion{
						ID: "v-staging", TemplateID: "tpl-1",
						Status:           entity.VersionStatusStaging,
						ContentStructure: content,
					},
				},
			},
		},
		pdfRenderer:     &pdfRendererStub{},
		customResolver:  customResolver,
		defaultResolver: &templateResolverStub{},
		searchAdapter:   &stubTemplateVersionSearchAdapter{},
	}

	result, err := service.RenderByDocumentType(context.Background(), templateuc.InternalRenderCommand{
		TenantCode:       "TENANT_A",
		WorkspaceCode:    "WS_1",
		TemplateTypeCode: "CONTRACT",
		StagingMode:      false, // NOT staging mode
		Injectables:      map[string]any{},
		Payload:          map[string]any{},
	})
	require.ErrorIs(t, err, entity.ErrTemplateNotResolved)
	assert.Nil(t, result)
}

type templateResolverStub struct {
	versionID *string
	err       error
	calls     int
	lastReq   *port.TemplateResolverRequest
}

func (s *templateResolverStub) Resolve(_ context.Context, req *port.TemplateResolverRequest, _ port.TemplateVersionSearchAdapter) (*string, error) {
	s.calls++
	s.lastReq = req
	return s.versionID, s.err
}

type pdfRendererStub struct {
	calls     int
	lastTitle string
}

func (s *pdfRendererStub) RenderPreview(_ context.Context, req *port.RenderPreviewRequest) (*port.RenderPreviewResult, error) {
	s.calls++
	if req != nil && req.Document != nil {
		s.lastTitle = req.Document.Meta.Title
	}
	return &port.RenderPreviewResult{
		PDF:       []byte("%PDF-1.7"),
		Filename:  "test.pdf",
		PageCount: 1,
	}, nil
}

func (s *pdfRendererStub) Close() error {
	return nil
}

func mustBuildPortableDoc(t *testing.T) json.RawMessage {
	return mustBuildPortableDocWithTitle(t, "Test")
}

func mustBuildPortableDocWithTitle(t *testing.T, title string) json.RawMessage {
	t.Helper()
	doc := &portabledoc.Document{
		Version: portabledoc.CurrentVersion,
		Meta: portabledoc.Meta{
			Title:    title,
			Language: "en",
		},
		PageConfig: portabledoc.PageConfig{
			FormatID: portabledoc.PageFormatA4,
			Width:    794,
			Height:   1123,
			Margins: portabledoc.Margins{
				Top:    96,
				Bottom: 96,
				Left:   72,
				Right:  72,
			},
		},
		Content: &portabledoc.ProseMirrorDoc{
			Type: "doc",
			Content: []portabledoc.Node{
				{
					Type: portabledoc.NodeTypeParagraph,
					Content: []portabledoc.Node{
						{Type: portabledoc.NodeTypeText, Text: strPtr("Hello")},
					},
				},
			},
		},
	}

	raw, err := json.Marshal(doc)
	require.NoError(t, err)
	return raw
}

func strPtr(v string) *string {
	return &v
}

type templateCacheStub struct {
	items    map[string]*entity.TemplateVersionWithDetails
	getCalls int
	setCalls int
}

func (c *templateCacheStub) Get(tenantCode, workspaceCode, docTypeCode string) *entity.TemplateVersionWithDetails {
	c.getCalls++
	if c.items == nil {
		return nil
	}
	return c.items[tenantCode+":"+workspaceCode+":"+docTypeCode]
}

func (c *templateCacheStub) Set(tenantCode, workspaceCode, docTypeCode string, version *entity.TemplateVersionWithDetails) {
	c.setCalls++
	if c.items == nil {
		c.items = map[string]*entity.TemplateVersionWithDetails{}
	}
	c.items[tenantCode+":"+workspaceCode+":"+docTypeCode] = version
}
