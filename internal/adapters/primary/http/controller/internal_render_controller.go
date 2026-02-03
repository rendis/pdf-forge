package controller

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/internal/adapters/primary/http/dto"
	"github.com/rendis/pdf-forge/internal/adapters/primary/http/middleware"
	templateuc "github.com/rendis/pdf-forge/internal/core/usecase/template"
	"github.com/rendis/pdf-forge/internal/infra/config"
)

// InternalRenderController handles internal template rendering HTTP requests.
type InternalRenderController struct {
	internalRenderUC templateuc.InternalRenderUseCase
	internalAPICfg   *config.InternalAPIConfig
}

// NewInternalRenderController creates a new internal render controller.
func NewInternalRenderController(
	internalRenderUC templateuc.InternalRenderUseCase,
	internalAPICfg *config.InternalAPIConfig,
) *InternalRenderController {
	return &InternalRenderController{
		internalRenderUC: internalRenderUC,
		internalAPICfg:   internalAPICfg,
	}
}

// RegisterRoutes registers internal render routes outside the authenticated route group.
func (c *InternalRenderController) RegisterRoutes(engine *gin.Engine) {
	internal := engine.Group("/api/v1/internal")
	internal.Use(middleware.Operation())
	internal.Use(middleware.APIKeyAuth(c.internalAPICfg.APIKey))

	internal.POST("/render/:tenantCode/:workspaceCode/:templateTypeCode", c.Render)
}

// Render resolves a template by tenant/workspace/docType codes and renders a PDF.
// @Summary Render PDF by document type codes
// @Tags Internal
// @Accept json
// @Produce application/pdf
// @Param X-API-Key header string true "Internal API Key"
// @Param tenantCode path string true "Tenant code"
// @Param workspaceCode path string true "Workspace code"
// @Param templateTypeCode path string true "Document type code"
// @Param disposition query string false "Content disposition: inline (default) or attachment"
// @Param request body dto.InternalRenderRequest false "Injectable values"
// @Success 200 {file} application/pdf
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /internal/render/{tenantCode}/{workspaceCode}/{templateTypeCode} [post]
func (c *InternalRenderController) Render(ctx *gin.Context) {
	tenantCode := ctx.Param("tenantCode")
	workspaceCode := ctx.Param("workspaceCode")
	templateTypeCode := ctx.Param("templateTypeCode")

	// Parse optional request body
	var req dto.InternalRenderRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		if err.Error() != "EOF" {
			respondError(ctx, http.StatusBadRequest, err)
			return
		}
		req.Injectables = make(map[string]any)
	}

	// Resolve and render
	result, err := c.internalRenderUC.RenderByDocumentType(ctx.Request.Context(), templateuc.InternalRenderCommand{
		TenantCode:       tenantCode,
		WorkspaceCode:    workspaceCode,
		TemplateTypeCode: templateTypeCode,
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

	slog.InfoContext(ctx.Request.Context(), "internal render completed",
		slog.String("tenant_code", tenantCode),
		slog.String("workspace_code", workspaceCode),
		slog.String("template_type_code", templateTypeCode),
		slog.Int("page_count", result.PageCount),
	)

	// Set response headers
	ctx.Header("Content-Type", "application/pdf")
	ctx.Header("Content-Disposition", fmt.Sprintf("%s; filename=\"%s\"", disposition, result.Filename))
	ctx.Header("Content-Length", fmt.Sprintf("%d", len(result.PDF)))

	ctx.Data(http.StatusOK, "application/pdf", result.PDF)
}
