package dto

// RenderPreviewRequest represents the request to generate a preview PDF.
type RenderPreviewRequest struct {
	// Injectables contains the values to inject into the document.
	// Keys are variable IDs, values are the actual values.
	Injectables map[string]any `json:"injectables"`
}

// RenderPreviewResponse is empty as the response is the PDF binary.
// The PDF is returned directly with Content-Type: application/pdf.
// This struct exists for documentation purposes.
type RenderPreviewResponse struct {
	// Response body is the raw PDF bytes
	// Headers:
	//   Content-Type: application/pdf
	//   Content-Disposition: attachment; filename="<document-title>.pdf"
}
