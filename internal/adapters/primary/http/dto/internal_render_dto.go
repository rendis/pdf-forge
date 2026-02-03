package dto

// InternalRenderRequest represents the request body for internal render endpoint.
type InternalRenderRequest struct {
	Injectables map[string]any `json:"injectables"`
}
