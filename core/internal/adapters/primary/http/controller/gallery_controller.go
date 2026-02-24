package controller

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/core/internal/adapters/primary/http/dto"
	"github.com/rendis/pdf-forge/core/internal/adapters/primary/http/middleware"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

const (
	defaultGalleryPage    = 1
	defaultGalleryPerPage = 20
	maxUploadSize         = 10 << 20 // 10 MB
	uploadFormField       = "file"
)

// GalleryController handles gallery asset HTTP requests.
// All routes are workspace-scoped and require panel auth.
type GalleryController struct {
	storage port.StorageProvider
}

// NewGalleryController creates a new gallery controller.
func NewGalleryController(storage port.StorageProvider) *GalleryController {
	return &GalleryController{storage: storage}
}

// RegisterRoutes registers all /workspace/gallery routes.
func (c *GalleryController) RegisterRoutes(rg *gin.RouterGroup, middlewareProvider *middleware.Provider) {
	gallery := rg.Group("/workspace/gallery")
	gallery.Use(middlewareProvider.WorkspaceContext())
	{
		gallery.GET("", c.ListAssets)                                // VIEWER+
		gallery.GET("/search", c.SearchAssets)                       // VIEWER+
		gallery.POST("", middleware.RequireEditor(), c.UploadAsset)  // EDITOR+
		gallery.DELETE("", middleware.RequireAdmin(), c.DeleteAsset) // ADMIN+
		gallery.GET("/url", c.GetAssetURL)                           // VIEWER+
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
	page, perPage := parsePagination(ctx)

	result, err := c.storage.List(ctx.Request.Context(), &port.StorageListRequest{
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
	query := ctx.Query("q")
	if query == "" {
		respondError(ctx, http.StatusBadRequest, fmt.Errorf("query parameter 'q' is required"))
		return
	}

	storageCtx := buildStorageContext(ctx)
	page, perPage := parsePagination(ctx)

	result, err := c.storage.Search(ctx.Request.Context(), &port.StorageSearchRequest{
		Storage: storageCtx,
		Query:   query,
		Page:    page,
		PerPage: perPage,
	})
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, toGalleryListResponse(result))
}

// UploadAsset uploads a new gallery asset.
// @Summary Upload gallery asset
// @Tags Gallery
// @Accept multipart/form-data
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param file formData file true "Image file to upload"
// @Success 201 {object} dto.GalleryUploadResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/workspace/gallery [post]
func (c *GalleryController) UploadAsset(ctx *gin.Context) {
	file, header, err := ctx.Request.FormFile(uploadFormField)
	if err != nil {
		respondError(ctx, http.StatusBadRequest, fmt.Errorf("file field '%s' is required", uploadFormField))
		return
	}
	defer file.Close()

	if err := validateUpload(header.Header.Get("Content-Type"), header.Size); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	storageCtx := buildStorageContext(ctx)
	result, err := c.storage.Upload(ctx.Request.Context(), &port.StorageUploadRequest{
		Storage:     storageCtx,
		Name:        header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		Size:        header.Size,
		Body:        file,
	})
	if err != nil {
		HandleError(ctx, err)
		return
	}

	slog.InfoContext(ctx.Request.Context(), "gallery asset uploaded",
		slog.String("key", result.Asset.Key),
		slog.String("name", result.Asset.Name),
		slog.Int64("size", result.Asset.Size),
	)

	ctx.JSON(http.StatusCreated, dto.GalleryUploadResponse{
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
	key := ctx.Query("key")
	if key == "" {
		respondError(ctx, http.StatusBadRequest, fmt.Errorf("query parameter 'key' is required"))
		return
	}

	storageCtx := buildStorageContext(ctx)
	if err := c.storage.Delete(ctx.Request.Context(), &port.StorageDeleteRequest{
		Storage: storageCtx,
		Key:     key,
	}); err != nil {
		HandleError(ctx, err)
		return
	}

	slog.InfoContext(ctx.Request.Context(), "gallery asset deleted", slog.String("key", key))
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
	key := ctx.Query("key")
	if key == "" {
		respondError(ctx, http.StatusBadRequest, fmt.Errorf("query parameter 'key' is required"))
		return
	}

	storageCtx := buildStorageContext(ctx)
	result, err := c.storage.GetURL(ctx.Request.Context(), &port.StorageGetURLRequest{
		Storage: storageCtx,
		Key:     key,
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

	return port.StorageContext{
		TenantID:      tenantID,
		TenantCode:    ctx.GetHeader("X-Tenant-Code"),
		WorkspaceID:   workspaceID,
		WorkspaceCode: ctx.GetHeader("X-Workspace-Code"),
	}
}

// validateUpload checks content type and file size constraints.
func validateUpload(contentType string, size int64) error {
	if !strings.HasPrefix(contentType, "image/") {
		return fmt.Errorf("only image files are allowed, got %q", contentType)
	}
	if size > maxUploadSize {
		return fmt.Errorf("file size %d exceeds maximum of %d bytes", size, maxUploadSize)
	}
	return nil
}

// parsePagination extracts page and perPage query parameters with defaults.
func parsePagination(ctx *gin.Context) (int, int) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", strconv.Itoa(defaultGalleryPage)))
	perPage, _ := strconv.Atoi(ctx.DefaultQuery("perPage", strconv.Itoa(defaultGalleryPerPage)))

	if page < 1 {
		page = defaultGalleryPage
	}
	if perPage < 1 {
		perPage = defaultGalleryPerPage
	}
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
		ThumbnailURL: asset.ThumbnailURL,
		CreatedAt:    asset.CreatedAt.Format(time.RFC3339),
	}
}
