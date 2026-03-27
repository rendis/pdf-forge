package port

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewGalleryStorageContext(t *testing.T) {
	ctx := NewGalleryStorageContext("tenant-1", "TENANT", "workspace-1", "WORKSPACE")
	assert.Equal(t, StorageContext{
		TenantID:      "tenant-1",
		TenantCode:    "TENANT",
		WorkspaceID:   "workspace-1",
		WorkspaceCode: "WORKSPACE",
	}, ctx)
}

func TestNewPreviewStorageContext(t *testing.T) {
	ctx := NewPreviewStorageContext("tenant-1", "workspace-1")
	assert.Equal(t, StorageContext{
		TenantID:    "tenant-1",
		WorkspaceID: "workspace-1",
	}, ctx)
}

func TestNewRenderStorageContext(t *testing.T) {
	ctx := NewRenderStorageContext("TENANT", "WORKSPACE")
	assert.Equal(t, StorageContext{
		TenantCode:    "TENANT",
		WorkspaceCode: "WORKSPACE",
	}, ctx)
}

func TestResolveStorageURL_StorageSchemeUsesProvider(t *testing.T) {
	provider := &storageProviderStub{
		getURLResult: &StorageGetURLResult{URL: "https://example.com/resolved.png"},
	}
	storageCtx := NewRenderStorageContext("TENANT", "WORKSPACE")

	resolved, err := ResolveStorageURL(context.Background(), provider, storageCtx, "storage://asset-key")
	require.NoError(t, err)
	assert.Equal(t, "https://example.com/resolved.png", resolved)
	require.NotNil(t, provider.lastGetURLReq)
	assert.Equal(t, "asset-key", provider.lastGetURLReq.Key)
	assert.Equal(t, storageCtx, provider.lastGetURLReq.Storage)
}

func TestResolveStorageURL_HTTPAndDataPassThrough(t *testing.T) {
	provider := &storageProviderStub{}
	storageCtx := NewRenderStorageContext("TENANT", "WORKSPACE")

	httpURL, err := ResolveStorageURL(context.Background(), provider, storageCtx, "https://example.com/image.png")
	require.NoError(t, err)
	assert.Equal(t, "https://example.com/image.png", httpURL)

	dataURL, err := ResolveStorageURL(context.Background(), provider, storageCtx, "data:image/png;base64,abc123")
	require.NoError(t, err)
	assert.Equal(t, "data:image/png;base64,abc123", dataURL)

	assert.Nil(t, provider.lastGetURLReq)
}

func TestResolveStorageURL_PropagatesProviderError(t *testing.T) {
	expectedErr := errors.New("provider exploded")
	provider := &storageProviderStub{getURLErr: expectedErr}

	_, err := ResolveStorageURL(context.Background(), provider, NewPreviewStorageContext("tenant-1", "workspace-1"), "storage://asset-key")
	require.Error(t, err)
	assert.ErrorIs(t, err, expectedErr)
}

func TestNewImageURLResolverUsesProvidedContext(t *testing.T) {
	provider := &storageProviderStub{
		getURLResult: &StorageGetURLResult{URL: "https://example.com/resolved.png"},
	}
	storageCtx := NewPreviewStorageContext("tenant-1", "workspace-1")
	resolver := NewImageURLResolver(provider, storageCtx)

	resolved, err := resolver(context.Background(), "storage://asset-key")
	require.NoError(t, err)
	assert.Equal(t, "https://example.com/resolved.png", resolved)
	require.NotNil(t, provider.lastGetURLReq)
	assert.Equal(t, storageCtx, provider.lastGetURLReq.Storage)
}

type storageProviderStub struct {
	getURLResult  *StorageGetURLResult
	getURLErr     error
	lastGetURLReq *StorageGetURLRequest
}

func (s *storageProviderStub) List(context.Context, *StorageListRequest) (*StorageListResult, error) {
	return &StorageListResult{}, nil
}

func (s *storageProviderStub) Search(context.Context, *StorageSearchRequest) (*StorageListResult, error) {
	return &StorageListResult{}, nil
}

func (s *storageProviderStub) InitUpload(context.Context, *StorageInitUploadRequest) (*StorageInitUploadResult, error) {
	return &StorageInitUploadResult{}, nil
}

func (s *storageProviderStub) CompleteUpload(context.Context, *StorageCompleteUploadRequest) (*StorageCompleteUploadResult, error) {
	return &StorageCompleteUploadResult{}, nil
}

func (s *storageProviderStub) Delete(context.Context, *StorageDeleteRequest) error {
	return nil
}

func (s *storageProviderStub) GetURL(_ context.Context, req *StorageGetURLRequest) (*StorageGetURLResult, error) {
	s.lastGetURLReq = req
	if s.getURLErr != nil {
		return nil, s.getURLErr
	}
	if s.getURLResult == nil {
		return &StorageGetURLResult{}, nil
	}
	return s.getURLResult, nil
}
