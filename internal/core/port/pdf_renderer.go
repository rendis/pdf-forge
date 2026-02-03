package port

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity/portabledoc"
)

// RenderPreviewRequest contains the data needed to render a preview PDF.
type RenderPreviewRequest struct {
	// Document is the parsed portable document to render.
	Document *portabledoc.Document

	// Injectables contains the values to inject into the document.
	// Keys are variable IDs, values are the actual values.
	Injectables map[string]any

	// InjectableDefaults contains default values for injectables.
	// Keys are variable IDs, values are the default string values.
	// Used as fallback when Injectables doesn't contain a value.
	InjectableDefaults map[string]string
}

// RenderPreviewResult contains the result of rendering a preview PDF.
type RenderPreviewResult struct {
	// PDF contains the raw PDF bytes.
	PDF []byte

	// Filename is the suggested filename for the PDF.
	Filename string

	// PageCount is the number of pages in the generated PDF.
	PageCount int
}

// PDFRenderer defines the interface for PDF rendering operations.
type PDFRenderer interface {
	// RenderPreview generates a preview PDF with injected values.
	// The document is rendered with all variables replaced by their provided values.
	// Conditional blocks are evaluated based on the injectable values.
	RenderPreview(ctx context.Context, req *RenderPreviewRequest) (*RenderPreviewResult, error)

	// Close releases any resources held by the renderer.
	// This should be called when the renderer is no longer needed.
	Close() error
}
