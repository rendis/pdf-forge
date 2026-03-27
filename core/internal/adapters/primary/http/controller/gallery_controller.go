package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/core/internal/adapters/primary/http/dto"
	"github.com/rendis/pdf-forge/core/internal/adapters/primary/http/middleware"
	"github.com/rendis/pdf-forge/core/internal/core/port"
	galleryuc "github.com/rendis/pdf-forge/core/internal/core/usecase/gallery"
)

// GalleryController handles gallery asset HTTP requests.
// All routes are workspace-scoped and require panel auth.
type GalleryController struct {
	galleryUC galleryuc.GalleryUseCase
}

// NewGalleryController creates a new gallery controller.
func NewGalleryController(galleryUC galleryuc.GalleryUseCase) *GalleryController {
	return &GalleryController{galleryUC: galleryUC}
}

// RegisterRoutes registers all /workspace/gallery routes.
func (c *GalleryController) RegisterRoutes(rg *gin.RouterGroup, middlewareProvider *middleware.Provider) {
	gallery := rg.Group("/workspace/gallery")
	gallery.Use(middlewareProvider.WorkspaceContext())
	{
		gallery.GET("", c.ListAssets)                                            // VIEWER+
		gallery.GET("/search", c.SearchAssets)                                   // VIEWER+
		gallery.POST("/upload/init", middleware.RequireEditor(), c.InitUpload)   // EDITOR+
		gallery.POST("/upload/complete", middleware.RequireEditor(), c.Complete) // EDITOR+
		gallery.DELETE("", middleware.RequireAdmin(), c.DeleteAsset)             // ADMIN+
		gallery.GET("/url", c.GetAssetURL)                                       // VIEWER+
	}
}

// ListAssets returns a paginated list of gallery assets.
// @Summary List gallery assets
// @Tags Gallery
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param page query int false "Page number (default 1)"
// @Param perPage query int false "Items per page (default 20)"
// @Success 200 {object} dto.GalleryListResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/workspace/gallery [get]
func (c *GalleryController) ListAssets(ctx *gin.Context) {
	storageCtx := buildStorageContext(ctx)
	page, perPage := parsePaginationParams(ctx)

	result, err := c.galleryUC.List(ctx.Request.Context(), galleryuc.ListCommand{
		Storage: storageCtx,
		Page:    page,
		PerPage: perPage,
	})
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, toGalleryListResponse(result))
}

// SearchAssets searches gallery assets by query string.
// @Summary Search gallery assets
// @Tags Gallery
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param q query string true "Search query"
// @Param page query int false "Page number (default 1)"
// @Param perPage query int false "Items per page (default 20)"
// @Success 200 {object} dto.GalleryListResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/workspace/gallery/search [get]
func (c *GalleryController) SearchAssets(ctx *gin.Context) {
	storageCtx := buildStorageContext(ctx)
	page, perPage := parsePaginationParams(ctx)

	result, err := c.galleryUC.Search(ctx.Request.Context(), galleryuc.SearchCommand{
		Storage: storageCtx,
		Query:   ctx.Query("q"),
		Page:    page,
		PerPage: perPage,
	})
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, toGalleryListResponse(result))
}

// InitUpload initiates a signed-URL upload for a new gallery asset.
// @Summary Initiate gallery upload
// @Tags Gallery
// @Accept json
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param body body dto.GalleryInitUploadRequest true "Upload metadata"
// @Success 200 {object} dto.GalleryInitUploadResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/workspace/gallery/upload/init [post]
func (c *GalleryController) InitUpload(ctx *gin.Context) {
	var req dto.GalleryInitUploadRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	storageCtx := buildStorageContext(ctx)
	result, err := c.galleryUC.InitUpload(ctx.Request.Context(), galleryuc.InitUploadCommand{
		Storage:     storageCtx,
		Filename:    req.Filename,
		ContentType: req.ContentType,
		Size:        req.Size,
		SHA256:      req.SHA256,
	})
	if err != nil {
		HandleError(ctx, err)
		return
	}

	resp := dto.GalleryInitUploadResponse{
		Duplicate: result.Duplicate,
		UploadID:  result.UploadID,
		SignedURL: result.SignedURL,
		ObjectKey: result.ObjectKey,
		Headers:   result.Headers,
	}
	if result.Asset != nil {
		asset := toGalleryAssetResponse(result.Asset)
		resp.Asset = &asset
	}

	ctx.JSON(http.StatusOK, resp)
}

// Complete finalizes a gallery upload after the client has PUT the file to the signed URL.
// @Summary Complete gallery upload
// @Tags Gallery
// @Accept json
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param body body dto.GalleryCompleteUploadRequest true "Upload completion"
// @Success 201 {object} dto.GalleryCompleteUploadResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/workspace/gallery/upload/complete [post]
func (c *GalleryController) Complete(ctx *gin.Context) {
	var req dto.GalleryCompleteUploadRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	storageCtx := buildStorageContext(ctx)
	result, err := c.galleryUC.CompleteUpload(ctx.Request.Context(), galleryuc.CompleteUploadCommand{
		Storage:  storageCtx,
		UploadID: req.UploadID,
	})
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, dto.GalleryCompleteUploadResponse{
		Asset: toGalleryAssetResponse(&result.Asset),
	})
}

// DeleteAsset deletes a gallery asset by key.
// @Summary Delete gallery asset
// @Tags Gallery
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param key query string true "Asset key"
// @Success 204 "No Content"
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/workspace/gallery [delete]
func (c *GalleryController) DeleteAsset(ctx *gin.Context) {
	storageCtx := buildStorageContext(ctx)
	if err := c.galleryUC.Delete(ctx.Request.Context(), galleryuc.DeleteCommand{
		Storage: storageCtx,
		Key:     ctx.Query("key"),
	}); err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

// GetAssetURL returns a URL for a gallery asset.
// @Summary Get gallery asset URL
// @Tags Gallery
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param key query string true "Asset key"
// @Success 200 {object} dto.GalleryURLResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/workspace/gallery/url [get]
func (c *GalleryController) GetAssetURL(ctx *gin.Context) {
	storageCtx := buildStorageContext(ctx)
	result, err := c.galleryUC.GetURL(ctx.Request.Context(), galleryuc.GetURLCommand{
		Storage: storageCtx,
		Key:     ctx.Query("key"),
	})
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, dto.GalleryURLResponse{URL: result.URL})
}

// buildStorageContext extracts tenant and workspace identifiers from the request context.
func buildStorageContext(ctx *gin.Context) port.StorageContext {
	workspaceID, _ := middleware.GetWorkspaceID(ctx)
	tenantID, _ := middleware.GetTenantIDFromHeader(ctx)

	return port.NewGalleryStorageContext(
		tenantID,
		ctx.GetHeader("X-Tenant-Code"),
		workspaceID,
		ctx.GetHeader("X-Workspace-Code"),
	)
}

// parsePaginationParams extracts raw page/perPage query parameters.
// Pagination defaults/clamping happen in the gallery service.
func parsePaginationParams(ctx *gin.Context) (int, int) {
	page, _ := strconv.Atoi(ctx.Query("page"))
	perPage, _ := strconv.Atoi(ctx.Query("perPage"))
	return page, perPage
}

// toGalleryListResponse converts a storage list result to a gallery list DTO.
func toGalleryListResponse(result *port.StorageListResult) dto.GalleryListResponse {
	assets := make([]dto.GalleryAssetResponse, len(result.Assets))
	for i := range result.Assets {
		assets[i] = toGalleryAssetResponse(&result.Assets[i])
	}

	return dto.GalleryListResponse{
		Assets:  assets,
		Total:   result.Total,
		Page:    result.Page,
		PerPage: result.PerPage,
	}
}

// toGalleryAssetResponse converts a storage asset to a gallery asset DTO.
func toGalleryAssetResponse(asset *port.StorageAsset) dto.GalleryAssetResponse {
	return dto.GalleryAssetResponse{
		Key:          asset.Key,
		Name:         asset.Name,
		ContentType:  asset.ContentType,
		Size:         asset.Size,
		SHA256:       asset.SHA256,
		ThumbnailURL: asset.ThumbnailURL,
		CreatedAt:    asset.CreatedAt.Format(time.RFC3339),
	}
}
