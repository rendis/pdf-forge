package port

import (
	"context"
	"time"
)

// StorageProvider defines the interface for pluggable asset storage.
// Implementations handle listing, searching, uploading (via signed URLs),
// deleting, and URL generation for workspace-scoped gallery images.
type StorageProvider interface {
	// List returns a paginated list of assets for the given workspace.
	List(ctx context.Context, req *StorageListRequest) (*StorageListResult, error)

	// Search returns assets matching a query string.
	Search(ctx context.Context, req *StorageSearchRequest) (*StorageListResult, error)

	// InitUpload validates metadata, generates a signed upload URL, and registers a pending upload.
	// If SHA256 is provided and matches an existing asset, returns Duplicate=true with the asset.
	InitUpload(ctx context.Context, req *StorageInitUploadRequest) (*StorageInitUploadResult, error)

	// CompleteUpload verifies the uploaded object, validates it, generates a thumbnail,
	// and marks the upload as completed. Idempotent — returns cached result if called twice.
	CompleteUpload(ctx context.Context, req *StorageCompleteUploadRequest) (*StorageCompleteUploadResult, error)

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
	SHA256       string    `json:"sha256,omitempty"`
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

// StorageInitUploadRequest is the input for InitUpload.
type StorageInitUploadRequest struct {
	Storage     StorageContext
	Filename    string // Original filename
	ContentType string // MIME type (must be image/*)
	Size        int64  // File size in bytes
	SHA256      string // Optional hex-encoded SHA-256 hash for dedup
}

// StorageInitUploadResult is the output of InitUpload.
type StorageInitUploadResult struct {
	// Duplicate is true when SHA256 matched an existing asset in the workspace.
	// When true, Asset is populated and SignedURL/UploadID/ObjectKey are empty.
	Duplicate bool
	// Asset is non-nil when Duplicate is true.
	Asset *StorageAsset
	// UploadID is a unique identifier for this pending upload.
	UploadID string
	// SignedURL is the URL the client should PUT the file to.
	SignedURL string
	// ObjectKey is the storage key for the uploaded object.
	ObjectKey string
	// Headers contains extra headers the client must include in the PUT request.
	Headers map[string]string
}

// StorageCompleteUploadRequest is the input for CompleteUpload.
type StorageCompleteUploadRequest struct {
	Storage  StorageContext
	UploadID string
}

// StorageCompleteUploadResult is the output of CompleteUpload.
type StorageCompleteUploadResult struct {
	Asset StorageAsset
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
