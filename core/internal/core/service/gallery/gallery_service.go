package gallery

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/rendis/pdf-forge/core/internal/core/port"
	galleryuc "github.com/rendis/pdf-forge/core/internal/core/usecase/gallery"
)

// NewGalleryService creates a new gallery service.
func NewGalleryService(storageProvider port.StorageProvider) galleryuc.GalleryUseCase {
	return &GalleryService{storageProvider: storageProvider}
}

// GalleryService implements gallery business logic on top of StorageProvider.
type GalleryService struct {
	storageProvider port.StorageProvider
}

// List lists gallery assets with normalized pagination.
func (s *GalleryService) List(ctx context.Context, cmd galleryuc.ListCommand) (*port.StorageListResult, error) {
	result, err := s.storageProvider.List(ctx, &port.StorageListRequest{
		Storage: cmd.Storage,
		Page:    normalizePage(cmd.Page),
		PerPage: normalizePerPage(cmd.PerPage),
	})
	if err != nil {
		return nil, fmt.Errorf("listing gallery assets: %w", err)
	}
	return result, nil
}

// Search searches gallery assets with normalized pagination.
func (s *GalleryService) Search(ctx context.Context, cmd galleryuc.SearchCommand) (*port.StorageListResult, error) {
	if cmd.Query == "" {
		return nil, galleryuc.ErrQueryRequired
	}

	result, err := s.storageProvider.Search(ctx, &port.StorageSearchRequest{
		Storage: cmd.Storage,
		Query:   cmd.Query,
		Page:    normalizePage(cmd.Page),
		PerPage: normalizePerPage(cmd.PerPage),
	})
	if err != nil {
		return nil, fmt.Errorf("searching gallery assets: %w", err)
	}
	return result, nil
}

// InitUpload validates upload metadata and initializes a gallery upload.
func (s *GalleryService) InitUpload(ctx context.Context, cmd galleryuc.InitUploadCommand) (*port.StorageInitUploadResult, error) {
	if err := validateUploadMeta(cmd.ContentType, cmd.Size); err != nil {
		return nil, err
	}

	result, err := s.storageProvider.InitUpload(ctx, &port.StorageInitUploadRequest{
		Storage:     cmd.Storage,
		Filename:    cmd.Filename,
		ContentType: cmd.ContentType,
		Size:        cmd.Size,
		SHA256:      cmd.SHA256,
	})
	if err != nil {
		return nil, fmt.Errorf("initiating gallery upload: %w", err)
	}

	slog.InfoContext(ctx, "gallery upload initiated",
		slog.Bool("duplicate", result.Duplicate),
		slog.String("uploadId", result.UploadID),
	)

	return result, nil
}

// CompleteUpload finalizes a gallery upload.
func (s *GalleryService) CompleteUpload(ctx context.Context, cmd galleryuc.CompleteUploadCommand) (*port.StorageCompleteUploadResult, error) {
	result, err := s.storageProvider.CompleteUpload(ctx, &port.StorageCompleteUploadRequest{
		Storage:  cmd.Storage,
		UploadID: cmd.UploadID,
	})
	if err != nil {
		return nil, fmt.Errorf("completing gallery upload: %w", err)
	}

	slog.InfoContext(ctx, "gallery upload completed",
		slog.String("key", result.Asset.Key),
		slog.String("name", result.Asset.Name),
		slog.Int64("size", result.Asset.Size),
	)

	return result, nil
}

// Delete deletes a gallery asset.
func (s *GalleryService) Delete(ctx context.Context, cmd galleryuc.DeleteCommand) error {
	if cmd.Key == "" {
		return galleryuc.ErrAssetKeyRequired
	}

	if err := s.storageProvider.Delete(ctx, &port.StorageDeleteRequest{
		Storage: cmd.Storage,
		Key:     cmd.Key,
	}); err != nil {
		return fmt.Errorf("deleting gallery asset: %w", err)
	}

	slog.InfoContext(ctx, "gallery asset deleted", slog.String("key", cmd.Key))
	return nil
}

// GetURL gets a URL for a gallery asset.
func (s *GalleryService) GetURL(ctx context.Context, cmd galleryuc.GetURLCommand) (*port.StorageGetURLResult, error) {
	if cmd.Key == "" {
		return nil, galleryuc.ErrAssetKeyRequired
	}

	result, err := s.storageProvider.GetURL(ctx, &port.StorageGetURLRequest{
		Storage: cmd.Storage,
		Key:     cmd.Key,
	})
	if err != nil {
		return nil, fmt.Errorf("getting gallery asset URL: %w", err)
	}
	return result, nil
}

func normalizePage(page int) int {
	if page < 1 {
		return galleryuc.DefaultPage
	}
	return page
}

func normalizePerPage(perPage int) int {
	if perPage < 1 {
		return galleryuc.DefaultPerPage
	}
	return perPage
}

func validateUploadMeta(contentType string, size int64) error {
	if !strings.HasPrefix(contentType, "image/") {
		return galleryuc.NewError(galleryuc.ErrUploadContentTypeInvalid, "only image files are allowed, got %q", contentType)
	}
	if size <= 0 {
		return galleryuc.NewError(galleryuc.ErrUploadSizeInvalid, "file size must be positive")
	}
	if size > galleryuc.MaxUploadSize {
		return galleryuc.NewError(galleryuc.ErrUploadSizeTooLarge, "file size %d exceeds maximum of %d bytes", size, galleryuc.MaxUploadSize)
	}
	return nil
}
