package port

import (
	"context"
	"strings"
)

// NewGalleryStorageContext builds storage context for panel gallery endpoints.
func NewGalleryStorageContext(tenantID, tenantCode, workspaceID, workspaceCode string) StorageContext {
	return StorageContext{
		TenantID:      tenantID,
		TenantCode:    tenantCode,
		WorkspaceID:   workspaceID,
		WorkspaceCode: workspaceCode,
	}
}

// NewPreviewStorageContext builds storage context for panel preview routes.
func NewPreviewStorageContext(tenantID, workspaceID string) StorageContext {
	return StorageContext{
		TenantID:    tenantID,
		WorkspaceID: workspaceID,
	}
}

// NewRenderStorageContext builds storage context for render routes.
func NewRenderStorageContext(tenantCode, workspaceCode string) StorageContext {
	return StorageContext{
		TenantCode:    tenantCode,
		WorkspaceCode: workspaceCode,
	}
}

// ResolveStorageURL resolves storage:// URLs through the configured StorageProvider.
func ResolveStorageURL(ctx context.Context, storageProvider StorageProvider, storageCtx StorageContext, rawURL string) (string, error) {
	if storageProvider == nil || !strings.HasPrefix(rawURL, "storage://") {
		return rawURL, nil
	}

	key := strings.TrimPrefix(rawURL, "storage://")
	result, err := storageProvider.GetURL(ctx, &StorageGetURLRequest{
		Storage: storageCtx,
		Key:     key,
	})
	if err != nil {
		return "", err
	}
	return result.URL, nil
}

// NewImageURLResolver returns a RenderPreview-compatible resolver backed by StorageProvider.
func NewImageURLResolver(storageProvider StorageProvider, storageCtx StorageContext) func(context.Context, string) (string, error) {
	return func(ctx context.Context, rawURL string) (string, error) {
		return ResolveStorageURL(ctx, storageProvider, storageCtx, rawURL)
	}
}
