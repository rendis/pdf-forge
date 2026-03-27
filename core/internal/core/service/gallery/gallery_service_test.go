package gallery

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/pdf-forge/core/internal/core/port"
	galleryuc "github.com/rendis/pdf-forge/core/internal/core/usecase/gallery"
)

func TestGalleryService_ListNormalizesPagination(t *testing.T) {
	provider := &fakeStorageProvider{
		listResult: &port.StorageListResult{},
	}
	service := NewGalleryService(provider)

	_, err := service.List(context.Background(), galleryuc.ListCommand{
		Storage: port.StorageContext{WorkspaceID: "ws-1"},
		Page:    0,
		PerPage: -1,
	})
	require.NoError(t, err)
	require.NotNil(t, provider.lastListReq)
	assert.Equal(t, galleryuc.DefaultPage, provider.lastListReq.Page)
	assert.Equal(t, galleryuc.DefaultPerPage, provider.lastListReq.PerPage)
}

func TestGalleryService_SearchRequiresQuery(t *testing.T) {
	service := NewGalleryService(&fakeStorageProvider{})

	_, err := service.Search(context.Background(), galleryuc.SearchCommand{})
	require.Error(t, err)
	assert.ErrorIs(t, err, galleryuc.ErrQueryRequired)
}

func TestGalleryService_SearchDelegatesToProvider(t *testing.T) {
	provider := &fakeStorageProvider{
		searchResult: &port.StorageListResult{},
	}
	service := NewGalleryService(provider)

	_, err := service.Search(context.Background(), galleryuc.SearchCommand{
		Storage: port.StorageContext{WorkspaceID: "ws-1"},
		Query:   "logo",
		Page:    2,
		PerPage: 15,
	})
	require.NoError(t, err)
	require.NotNil(t, provider.lastSearchReq)
	assert.Equal(t, "logo", provider.lastSearchReq.Query)
	assert.Equal(t, 2, provider.lastSearchReq.Page)
	assert.Equal(t, 15, provider.lastSearchReq.PerPage)
}

func TestGalleryService_InitUploadValidatesContentType(t *testing.T) {
	service := NewGalleryService(&fakeStorageProvider{})

	_, err := service.InitUpload(context.Background(), galleryuc.InitUploadCommand{
		ContentType: "application/pdf",
		Size:        1,
	})
	require.Error(t, err)
	assert.ErrorIs(t, err, galleryuc.ErrUploadContentTypeInvalid)
	assert.EqualError(t, err, `only image files are allowed, got "application/pdf"`)
}

func TestGalleryService_InitUploadValidatesPositiveSize(t *testing.T) {
	service := NewGalleryService(&fakeStorageProvider{})

	_, err := service.InitUpload(context.Background(), galleryuc.InitUploadCommand{
		ContentType: "image/png",
		Size:        0,
	})
	require.Error(t, err)
	assert.ErrorIs(t, err, galleryuc.ErrUploadSizeInvalid)
	assert.EqualError(t, err, "file size must be positive")
}

func TestGalleryService_InitUploadValidatesMaxSize(t *testing.T) {
	service := NewGalleryService(&fakeStorageProvider{})

	_, err := service.InitUpload(context.Background(), galleryuc.InitUploadCommand{
		ContentType: "image/png",
		Size:        galleryuc.MaxUploadSize + 1,
	})
	require.Error(t, err)
	assert.ErrorIs(t, err, galleryuc.ErrUploadSizeTooLarge)
	assert.EqualError(t, err, "file size 10485761 exceeds maximum of 10485760 bytes")
}

func TestGalleryService_InitUploadDelegatesToProvider(t *testing.T) {
	provider := &fakeStorageProvider{
		initUploadResult: &port.StorageInitUploadResult{
			UploadID:  "upload-1",
			SignedURL: "https://example.com/upload",
		},
	}
	service := NewGalleryService(provider)

	result, err := service.InitUpload(context.Background(), galleryuc.InitUploadCommand{
		Storage:     port.StorageContext{WorkspaceID: "ws-1"},
		Filename:    "logo.png",
		ContentType: "image/png",
		Size:        512,
		SHA256:      "abc123",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, provider.lastInitUploadReq)
	assert.Equal(t, "logo.png", provider.lastInitUploadReq.Filename)
	assert.Equal(t, "image/png", provider.lastInitUploadReq.ContentType)
	assert.EqualValues(t, 512, provider.lastInitUploadReq.Size)
	assert.Equal(t, "abc123", provider.lastInitUploadReq.SHA256)
}

func TestGalleryService_CompleteUploadDelegatesToProvider(t *testing.T) {
	provider := &fakeStorageProvider{
		completeUploadResult: &port.StorageCompleteUploadResult{
			Asset: port.StorageAsset{Key: "asset-1"},
		},
	}
	service := NewGalleryService(provider)

	result, err := service.CompleteUpload(context.Background(), galleryuc.CompleteUploadCommand{
		Storage:  port.StorageContext{WorkspaceID: "ws-1"},
		UploadID: "upload-1",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, provider.lastCompleteUploadReq)
	assert.Equal(t, "upload-1", provider.lastCompleteUploadReq.UploadID)
}

func TestGalleryService_DeleteRequiresKey(t *testing.T) {
	service := NewGalleryService(&fakeStorageProvider{})

	err := service.Delete(context.Background(), galleryuc.DeleteCommand{})
	require.Error(t, err)
	assert.ErrorIs(t, err, galleryuc.ErrAssetKeyRequired)
}

func TestGalleryService_DeleteDelegatesToProvider(t *testing.T) {
	provider := &fakeStorageProvider{}
	service := NewGalleryService(provider)

	err := service.Delete(context.Background(), galleryuc.DeleteCommand{
		Storage: port.StorageContext{WorkspaceID: "ws-1"},
		Key:     "asset-1",
	})
	require.NoError(t, err)
	require.NotNil(t, provider.lastDeleteReq)
	assert.Equal(t, "asset-1", provider.lastDeleteReq.Key)
}

func TestGalleryService_GetURLRequiresKey(t *testing.T) {
	service := NewGalleryService(&fakeStorageProvider{})

	_, err := service.GetURL(context.Background(), galleryuc.GetURLCommand{})
	require.Error(t, err)
	assert.ErrorIs(t, err, galleryuc.ErrAssetKeyRequired)
}

func TestGalleryService_GetURLDelegatesToProvider(t *testing.T) {
	provider := &fakeStorageProvider{
		getURLResult: &port.StorageGetURLResult{URL: "https://example.com/asset.png"},
	}
	service := NewGalleryService(provider)

	result, err := service.GetURL(context.Background(), galleryuc.GetURLCommand{
		Storage: port.StorageContext{WorkspaceID: "ws-1"},
		Key:     "asset-1",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, provider.lastGetURLReq)
	assert.Equal(t, "asset-1", provider.lastGetURLReq.Key)
	assert.Equal(t, "https://example.com/asset.png", result.URL)
}

func TestGalleryService_WrapsProviderErrors(t *testing.T) {
	expectedErr := errors.New("provider exploded")
	provider := &fakeStorageProvider{listErr: expectedErr}
	service := NewGalleryService(provider)

	_, err := service.List(context.Background(), galleryuc.ListCommand{})
	require.Error(t, err)
	assert.ErrorIs(t, err, expectedErr)
	assert.Contains(t, err.Error(), "listing gallery assets")
}

type fakeStorageProvider struct {
	listResult           *port.StorageListResult
	listErr              error
	searchResult         *port.StorageListResult
	searchErr            error
	initUploadResult     *port.StorageInitUploadResult
	initUploadErr        error
	completeUploadResult *port.StorageCompleteUploadResult
	completeUploadErr    error
	deleteErr            error
	getURLResult         *port.StorageGetURLResult
	getURLErr            error

	lastListReq           *port.StorageListRequest
	lastSearchReq         *port.StorageSearchRequest
	lastInitUploadReq     *port.StorageInitUploadRequest
	lastCompleteUploadReq *port.StorageCompleteUploadRequest
	lastDeleteReq         *port.StorageDeleteRequest
	lastGetURLReq         *port.StorageGetURLRequest
}

func (f *fakeStorageProvider) List(_ context.Context, req *port.StorageListRequest) (*port.StorageListResult, error) {
	f.lastListReq = req
	if f.listErr != nil {
		return nil, f.listErr
	}
	if f.listResult == nil {
		return &port.StorageListResult{}, nil
	}
	return f.listResult, nil
}

func (f *fakeStorageProvider) Search(_ context.Context, req *port.StorageSearchRequest) (*port.StorageListResult, error) {
	f.lastSearchReq = req
	if f.searchErr != nil {
		return nil, f.searchErr
	}
	if f.searchResult == nil {
		return &port.StorageListResult{}, nil
	}
	return f.searchResult, nil
}

func (f *fakeStorageProvider) InitUpload(_ context.Context, req *port.StorageInitUploadRequest) (*port.StorageInitUploadResult, error) {
	f.lastInitUploadReq = req
	if f.initUploadErr != nil {
		return nil, f.initUploadErr
	}
	if f.initUploadResult == nil {
		return &port.StorageInitUploadResult{}, nil
	}
	return f.initUploadResult, nil
}

func (f *fakeStorageProvider) CompleteUpload(_ context.Context, req *port.StorageCompleteUploadRequest) (*port.StorageCompleteUploadResult, error) {
	f.lastCompleteUploadReq = req
	if f.completeUploadErr != nil {
		return nil, f.completeUploadErr
	}
	if f.completeUploadResult == nil {
		return &port.StorageCompleteUploadResult{}, nil
	}
	return f.completeUploadResult, nil
}

func (f *fakeStorageProvider) Delete(_ context.Context, req *port.StorageDeleteRequest) error {
	f.lastDeleteReq = req
	return f.deleteErr
}

func (f *fakeStorageProvider) GetURL(_ context.Context, req *port.StorageGetURLRequest) (*port.StorageGetURLResult, error) {
	f.lastGetURLReq = req
	if f.getURLErr != nil {
		return nil, f.getURLErr
	}
	if f.getURLResult == nil {
		return &port.StorageGetURLResult{}, nil
	}
	return f.getURLResult, nil
}
