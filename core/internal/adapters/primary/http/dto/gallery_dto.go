package dto

// GalleryAssetResponse represents a single gallery asset.
type GalleryAssetResponse struct {
	Key          string `json:"key"`
	Name         string `json:"name"`
	ContentType  string `json:"contentType"`
	Size         int64  `json:"size"`
	SHA256       string `json:"sha256,omitempty"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty"`
	CreatedAt    string `json:"createdAt"`
}

// GalleryListResponse represents a paginated list of gallery assets.
type GalleryListResponse struct {
	Assets  []GalleryAssetResponse `json:"assets"`
	Total   int                    `json:"total"`
	Page    int                    `json:"page"`
	PerPage int                    `json:"perPage"`
}

// GalleryInitUploadRequest is the body for POST /workspace/gallery/upload/init.
type GalleryInitUploadRequest struct {
	Filename    string `json:"filename" binding:"required"`
	ContentType string `json:"contentType" binding:"required"`
	Size        int64  `json:"size" binding:"required,min=1"`
	SHA256      string `json:"sha256,omitempty"`
}

// GalleryInitUploadResponse is the response for POST /workspace/gallery/upload/init.
type GalleryInitUploadResponse struct {
	Duplicate bool                  `json:"duplicate"`
	Asset     *GalleryAssetResponse `json:"asset,omitempty"`
	UploadID  string                `json:"uploadId,omitempty"`
	SignedURL string                `json:"signedUrl,omitempty"`
	ObjectKey string                `json:"objectKey,omitempty"`
	Headers   map[string]string     `json:"headers,omitempty"`
}

// GalleryCompleteUploadRequest is the body for POST /workspace/gallery/upload/complete.
type GalleryCompleteUploadRequest struct {
	UploadID string `json:"uploadId" binding:"required"`
}

// GalleryCompleteUploadResponse is the response for POST /workspace/gallery/upload/complete.
type GalleryCompleteUploadResponse struct {
	Asset GalleryAssetResponse `json:"asset"`
}

// GalleryURLResponse represents a URL for a gallery asset.
type GalleryURLResponse struct {
	URL string `json:"url"`
}
