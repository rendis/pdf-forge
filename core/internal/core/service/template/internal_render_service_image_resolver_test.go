package template

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
	templateuc "github.com/rendis/pdf-forge/core/internal/core/usecase/template"
)

func TestInternalRenderService_RenderVersionUsesSharedStorageResolver(t *testing.T) {
	storageProvider := &imageResolverStorageProviderStub{
		getURLResult: &port.StorageGetURLResult{URL: "https://example.com/resolved.png"},
	}
	renderer := &imageResolverPDFRendererStub{}
	service := &InternalRenderService{
		pdfRenderer:     renderer,
		storageProvider: storageProvider,
	}

	version := &entity.TemplateVersionWithDetails{
		TemplateVersion: entity.TemplateVersion{
			ID:               "version-1",
			ContentStructure: mustBuildPortableDoc(t),
		},
	}

	result, err := service.renderVersion(context.Background(), version, templateuc.InternalRenderCommand{
		TenantCode:    "TENANT_A",
		WorkspaceCode: "WS_1",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, storageProvider.lastGetURLReq)
	assert.Equal(t, "asset-key", storageProvider.lastGetURLReq.Key)
	assert.Equal(t, port.NewRenderStorageContext("TENANT_A", "WS_1"), storageProvider.lastGetURLReq.Storage)
	assert.Equal(t, "https://example.com/resolved.png", renderer.resolvedURL)
}

type imageResolverPDFRendererStub struct {
	resolvedURL string
}

func (s *imageResolverPDFRendererStub) RenderPreview(ctx context.Context, req *port.RenderPreviewRequest) (*port.RenderPreviewResult, error) {
	if req != nil && req.ImageURLResolver != nil {
		resolved, err := req.ImageURLResolver(ctx, "storage://asset-key")
		if err != nil {
			return nil, err
		}
		s.resolvedURL = resolved
	}

	return &port.RenderPreviewResult{
		PDF:       []byte("%PDF-1.7"),
		Filename:  "test.pdf",
		PageCount: 1,
	}, nil
}

func (s *imageResolverPDFRendererStub) Close() error {
	return nil
}

type imageResolverStorageProviderStub struct {
	getURLResult  *port.StorageGetURLResult
	lastGetURLReq *port.StorageGetURLRequest
}

func (s *imageResolverStorageProviderStub) List(context.Context, *port.StorageListRequest) (*port.StorageListResult, error) {
	return &port.StorageListResult{}, nil
}

func (s *imageResolverStorageProviderStub) Search(context.Context, *port.StorageSearchRequest) (*port.StorageListResult, error) {
	return &port.StorageListResult{}, nil
}

func (s *imageResolverStorageProviderStub) InitUpload(context.Context, *port.StorageInitUploadRequest) (*port.StorageInitUploadResult, error) {
	return &port.StorageInitUploadResult{}, nil
}

func (s *imageResolverStorageProviderStub) CompleteUpload(context.Context, *port.StorageCompleteUploadRequest) (*port.StorageCompleteUploadResult, error) {
	return &port.StorageCompleteUploadResult{}, nil
}

func (s *imageResolverStorageProviderStub) Delete(context.Context, *port.StorageDeleteRequest) error {
	return nil
}

func (s *imageResolverStorageProviderStub) GetURL(_ context.Context, req *port.StorageGetURLRequest) (*port.StorageGetURLResult, error) {
	s.lastGetURLReq = req
	if s.getURLResult == nil {
		return &port.StorageGetURLResult{}, nil
	}
	return s.getURLResult, nil
}
