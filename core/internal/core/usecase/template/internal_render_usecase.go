package template

import (
	"context"

	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// InternalRenderCommand contains the parameters for resolving and rendering a template by codes.
type InternalRenderCommand struct {
	TenantCode       string
	WorkspaceCode    string
	TemplateTypeCode string
	Injectables      map[string]any
	Headers          map[string]string
	Payload          any
}

// RenderByVersionIDCommand contains the parameters for rendering a specific template version by ID.
type RenderByVersionIDCommand struct {
	VersionID     string
	TenantCode    string
	WorkspaceCode string
	Injectables   map[string]any
	Headers       map[string]string
	Payload       any
}

// InternalRenderUseCase defines the input port for internal template rendering by codes.
type InternalRenderUseCase interface {
	// RenderByDocumentType resolves a template using the fallback chain
	// (workspace → tenant system workspace → global system) and renders a PDF.
	RenderByDocumentType(ctx context.Context, cmd InternalRenderCommand) (*port.RenderPreviewResult, error)

	// RenderByVersionID renders a specific template version by ID, bypassing document type resolution.
	// Uses the full injectable resolution pipeline (InitFuncs, registry, provider).
	RenderByVersionID(ctx context.Context, cmd RenderByVersionIDCommand) (*port.RenderPreviewResult, error)
}
