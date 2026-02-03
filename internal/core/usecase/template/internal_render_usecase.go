package template

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/port"
)

// InternalRenderCommand contains the parameters for resolving and rendering a template by codes.
type InternalRenderCommand struct {
	TenantCode       string
	WorkspaceCode    string
	TemplateTypeCode string
	Injectables      map[string]any
}

// InternalRenderUseCase defines the input port for internal template rendering by codes.
type InternalRenderUseCase interface {
	// RenderByDocumentType resolves a template using the fallback chain
	// (workspace → tenant system workspace → global system) and renders a PDF.
	RenderByDocumentType(ctx context.Context, cmd InternalRenderCommand) (*port.RenderPreviewResult, error)
}
