package dto

// RenderRequest represents the request body for render endpoints.
type RenderRequest struct {
	Injectables map[string]any `json:"injectables"`
}

// RenderPreviewRequest is used for preview rendering.
// Has the same structure as RenderRequest.
type RenderPreviewRequest = RenderRequest

// InternalRenderRequest is an alias for RenderRequest for backwards compatibility.
//
// Deprecated: Use RenderRequest instead.
type InternalRenderRequest = RenderRequest
