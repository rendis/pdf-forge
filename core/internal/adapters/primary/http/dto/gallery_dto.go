package dto

// GalleryAssetResponse represents a single gallery asset.
type GalleryAssetResponse struct {
	Key          string `json:"key"`
	Name         string `json:"name"`
	ContentType  string `json:"contentType"`
	Size         int64  `json:"size"`
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

// GalleryUploadResponse represents the result of uploading a gallery asset.
type GalleryUploadResponse struct {
	Asset GalleryAssetResponse `json:"asset"`
}

// GalleryURLResponse represents a URL for a gallery asset.
type GalleryURLResponse struct {
	URL string `json:"url"`
}
