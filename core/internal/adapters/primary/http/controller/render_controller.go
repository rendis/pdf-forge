package controller

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/internal/adapters/primary/http/dto"
	"github.com/rendis/pdf-forge/internal/adapters/primary/http/middleware"
	"github.com/rendis/pdf-forge/internal/core/entity/portabledoc"
	"github.com/rendis/pdf-forge/internal/core/port"
	templatesvc "github.com/rendis/pdf-forge/internal/core/service/template"
	templateuc "github.com/rendis/pdf-forge/internal/core/usecase/template"
)

// RenderController handles document rendering HTTP requests.
// For document type render routes, no RBAC is enforced in this controller.
// Users should implement custom authorization via engine.UseAPIMiddleware() if needed.
type RenderController struct {
	versionUC            templateuc.TemplateVersionUseCase
	documentTypeRenderUC templateuc.InternalRenderUseCase
	pdfRenderer          port.PDFRenderer
}

// NewRenderController creates a new render controller.
func NewRenderController(
	versionUC templateuc.TemplateVersionUseCase,
	documentTypeRenderUC templateuc.InternalRenderUseCase,
	pdfRenderer port.PDFRenderer,
) *RenderController {
	return &RenderController{
		versionUC:            versionUC,
		documentTypeRenderUC: documentTypeRenderUC,
		pdfRenderer:          pdfRenderer,
	}
}

// RegisterRoutes registers all render routes.
// These routes are nested under /content/templates/:templateId/versions/:versionId
func (c *RenderController) RegisterRoutes(versions *gin.RouterGroup) {
	// Preview route requires EDITOR+ role
	versions.POST("/:versionId/preview", middleware.RequireEditor(), c.PreviewVersion)
}

// RegisterWorkspaceRoutes registers document type render routes under workspace.
// Route: POST /api/v1/workspace/document-types/{code}/render
// No RBAC is enforced - users should add custom authorization via engine.UseAPIMiddleware().
func (c *RenderController) RegisterWorkspaceRoutes(workspaceGroup *gin.RouterGroup) {
	workspaceGroup.POST("/document-types/:code/render", c.RenderByDocumentType)
}

// PreviewVersion generates a preview PDF for a template version.
// @Summary Generate preview PDF
// @Tags Template Versions
// @Accept json
// @Produce application/pdf
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param templateId path string true "Template ID"
// @Param versionId path string true "Version ID"
// @Param request body dto.RenderPreviewRequest true "Injectable values"
// @Success 200 {file} application/pdf
// @Failure 400 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/content/templates/{templateId}/versions/{versionId}/preview [post]
func (c *RenderController) PreviewVersion(ctx *gin.Context) {
	versionID := ctx.Param("versionId")

	// Parse request body
	var req dto.RenderPreviewRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		// Allow empty body (no injectables)
		if err.Error() != "EOF" {
			respondError(ctx, http.StatusBadRequest, err)
			return
		}
		req.Injectables = make(map[string]any)
	}

	// Get version with details
	details, err := c.versionUC.GetVersionWithDetails(ctx.Request.Context(), versionID)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	// Parse content structure into portable document
	doc, err := portabledoc.Parse(details.ContentStructure)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "failed to parse content structure",
			slog.String("version_id", versionID),
			slog.Any("error", err),
		)
		respondError(ctx, http.StatusInternalServerError, fmt.Errorf("invalid content structure"))
		return
	}

	if doc == nil {
		respondError(ctx, http.StatusBadRequest, fmt.Errorf("version has no content"))
		return
	}

	// Build injectable defaults map from version injectables
	injectableDefaults := templatesvc.BuildVersionInjectableDefaults(details.Injectables)

	// Render PDF
	result, err := c.pdfRenderer.RenderPreview(ctx.Request.Context(), &port.RenderPreviewRequest{
		Document:           doc,
		Injectables:        req.Injectables,
		InjectableDefaults: injectableDefaults,
	})
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "failed to render PDF",
			slog.String("version_id", versionID),
			slog.Any("error", err),
		)
		respondError(ctx, http.StatusInternalServerError, fmt.Errorf("failed to generate PDF"))
		return
	}

	// Set response headers
	ctx.Header("Content-Type", "application/pdf")
	ctx.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", result.Filename))
	ctx.Header("Content-Length", fmt.Sprintf("%d", len(result.PDF)))

	// Write PDF bytes
	ctx.Data(http.StatusOK, "application/pdf", result.PDF)
}

// RenderByDocumentType resolves a template by document type code and renders a PDF.
// Uses the fallback chain: workspace → tenant system workspace → global system.
// @Summary Render PDF by document type
// @Tags Workspace - Render
// @Accept json
// @Produce application/pdf
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param code path string true "Document type code"
// @Param disposition query string false "Content disposition: inline (default) or attachment"
// @Param request body dto.RenderRequest false "Injectable values"
// @Success 200 {file} application/pdf
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/workspace/document-types/{code}/render [post]
// @Security BearerAuth
func (c *RenderController) RenderByDocumentType(ctx *gin.Context) {
	workspaceID, ok := middleware.GetWorkspaceID(ctx)
	if !ok {
		respondError(ctx, http.StatusBadRequest, fmt.Errorf("workspace ID not found in context"))
		return
	}

	documentTypeCode := ctx.Param("code")

	// Parse optional request body
	var req dto.RenderRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		if err.Error() != "EOF" {
			respondError(ctx, http.StatusBadRequest, err)
			return
		}
		req.Injectables = make(map[string]any)
	}

	// Resolve and render
	result, err := c.documentTypeRenderUC.RenderByWorkspaceID(ctx.Request.Context(), templateuc.RenderByWorkspaceCommand{
		WorkspaceID:      workspaceID,
		DocumentTypeCode: documentTypeCode,
		Injectables:      req.Injectables,
	})
	if err != nil {
		HandleError(ctx, err)
		return
	}

	// Determine disposition
	disposition := ctx.DefaultQuery("disposition", "inline")
	if disposition != "attachment" {
		disposition = "inline"
	}

	slog.InfoContext(ctx.Request.Context(), "document type render completed",
		slog.String("workspace_id", workspaceID),
		slog.String("document_type_code", documentTypeCode),
		slog.Int("page_count", result.PageCount),
	)

	// Set response headers
	ctx.Header("Content-Type", "application/pdf")
	ctx.Header("Content-Disposition", fmt.Sprintf("%s; filename=\"%s\"", disposition, result.Filename))
	ctx.Header("Content-Length", fmt.Sprintf("%d", len(result.PDF)))

	ctx.Data(http.StatusOK, "application/pdf", result.PDF)
}
