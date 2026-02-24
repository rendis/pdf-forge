package port

import (
	"context"
	"io"
	"time"
)

// StorageProvider defines the interface for pluggable asset storage.
// Implementations handle listing, searching, uploading, deleting, and URL generation
// for workspace-scoped gallery images.
type StorageProvider interface {
	// List returns a paginated list of assets for the given workspace.
	List(ctx context.Context, req *StorageListRequest) (*StorageListResult, error)

	// Search returns assets matching a query string.
	Search(ctx context.Context, req *StorageSearchRequest) (*StorageListResult, error)

	// Upload stores a new asset and returns its metadata.
	Upload(ctx context.Context, req *StorageUploadRequest) (*StorageUploadResult, error)

	// Delete removes an asset by key.
	Delete(ctx context.Context, req *StorageDeleteRequest) error

	// GetURL returns a fresh (possibly signed/temporary) URL for an asset.
	GetURL(ctx context.Context, req *StorageGetURLRequest) (*StorageGetURLResult, error)
}

// StorageContext identifies the tenant and workspace for a storage operation.
type StorageContext struct {
	TenantID      string
	TenantCode    string
	WorkspaceID   string
	WorkspaceCode string
}

// StorageAsset represents a single stored file.
type StorageAsset struct {
	Key          string    `json:"key"`
	Name         string    `json:"name"`
	ContentType  string    `json:"contentType"`
	Size         int64     `json:"size"`
	ThumbnailURL string    `json:"thumbnailUrl,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// StorageListRequest is the input for List.
type StorageListRequest struct {
	Storage StorageContext
	Page    int
	PerPage int
}

// StorageSearchRequest is the input for Search.
type StorageSearchRequest struct {
	Storage StorageContext
	Query   string
	Page    int
	PerPage int
}

// StorageListResult is a paginated list of assets.
type StorageListResult struct {
	Assets  []StorageAsset `json:"assets"`
	Total   int            `json:"total"`
	Page    int            `json:"page"`
	PerPage int            `json:"perPage"`
}

// StorageUploadRequest is the input for Upload.
type StorageUploadRequest struct {
	Storage     StorageContext
	Name        string
	ContentType string
	Size        int64
	Body        io.Reader
}

// StorageUploadResult is the output of Upload.
type StorageUploadResult struct {
	Asset StorageAsset `json:"asset"`
}

// StorageDeleteRequest is the input for Delete.
type StorageDeleteRequest struct {
	Storage StorageContext
	Key     string
}

// StorageGetURLRequest is the input for GetURL.
type StorageGetURLRequest struct {
	Storage StorageContext
	Key     string
}

// StorageGetURLResult is the output of GetURL.
type StorageGetURLResult struct {
	URL string `json:"url"`
}
