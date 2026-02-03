package controller

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/internal/adapters/primary/http/dto"
	"github.com/rendis/pdf-forge/internal/core/entity"
)

// respondError sends an error response.
func respondError(ctx *gin.Context, statusCode int, err error) {
	ctx.JSON(statusCode, dto.NewErrorResponse(err))
}

// HandleError maps domain errors to HTTP status codes.
// This is a centralized error handler that consolidates all error handling logic
// from the various controller-specific error handlers.
func HandleError(ctx *gin.Context, err error) {
	// Check for ContentValidationError first (special handling)
	var validationErr *entity.ContentValidationError
	if errors.As(err, &validationErr) {
		ctx.JSON(http.StatusUnprocessableEntity, dto.NewContentValidationErrorResponse(validationErr))
		return
	}

	// Check for MissingInjectablesError (special handling)
	var missingInjectablesErr *entity.MissingInjectablesError
	if errors.As(err, &missingInjectablesErr) {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error":        missingInjectablesErr.Error(),
			"missingCodes": missingInjectablesErr.MissingCodes,
		})
		return
	}

	statusCode := mapErrorToStatusCode(err)
	if statusCode == http.StatusInternalServerError {
		slog.ErrorContext(ctx.Request.Context(), "unhandled error", slog.Any("error", err))
	}
	respondError(ctx, statusCode, err)
}

// mapErrorToStatusCode determines the appropriate HTTP status code for an error.
func mapErrorToStatusCode(err error) int {
	switch {
	case is404Error(err):
		return http.StatusNotFound
	case is409Error(err):
		return http.StatusConflict
	case is400Error(err):
		return http.StatusBadRequest
	case is403Error(err):
		return http.StatusForbidden
	case is401Error(err):
		return http.StatusUnauthorized
	case is503Error(err):
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// is404Error returns true if the error should result in a 404 Not Found response.
func is404Error(err error) bool {
	return errors.Is(err, entity.ErrInjectableNotFound) ||
		errors.Is(err, entity.ErrTemplateNotFound) ||
		errors.Is(err, entity.ErrTagNotFound) ||
		errors.Is(err, entity.ErrVersionNotFound) ||
		errors.Is(err, entity.ErrVersionInjectableNotFound) ||
		errors.Is(err, entity.ErrWorkspaceNotFound) ||
		errors.Is(err, entity.ErrFolderNotFound) ||
		errors.Is(err, entity.ErrUserNotFound) ||
		errors.Is(err, entity.ErrMemberNotFound) ||
		errors.Is(err, entity.ErrTenantNotFound) ||
		errors.Is(err, entity.ErrTenantMemberNotFound) ||
		errors.Is(err, entity.ErrSystemRoleNotFound) ||
		errors.Is(err, entity.ErrDocumentTypeNotFound) ||
		errors.Is(err, entity.ErrTemplateNotResolved)
}

// is409Error returns true if the error should result in a 409 Conflict response.
//
//nolint:gocyclo // Simple list of error checks that grows with features
func is409Error(err error) bool {
	return errors.Is(err, entity.ErrInjectableAlreadyExists) ||
		errors.Is(err, entity.ErrTemplateAlreadyExists) ||
		errors.Is(err, entity.ErrVersionAlreadyExists) ||
		errors.Is(err, entity.ErrVersionNameExists) ||
		errors.Is(err, entity.ErrWorkspaceAlreadyExists) ||
		errors.Is(err, entity.ErrFolderAlreadyExists) ||
		errors.Is(err, entity.ErrTagAlreadyExists) ||
		errors.Is(err, entity.ErrSystemWorkspaceExists) ||
		errors.Is(err, entity.ErrMemberAlreadyExists) ||
		errors.Is(err, entity.ErrTenantAlreadyExists) ||
		errors.Is(err, entity.ErrGlobalWorkspaceExists) ||
		errors.Is(err, entity.ErrTenantMemberExists) ||
		errors.Is(err, entity.ErrScheduledTimeConflict) ||
		errors.Is(err, entity.ErrDocumentTypeCodeExists) ||
		errors.Is(err, entity.ErrDocumentTypeAlreadyAssigned) ||
		errors.Is(err, entity.ErrSystemRoleExists)
}

// is400Error returns true if the error should result in a 400 Bad Request response.
func is400Error(err error) bool {
	return errors.Is(err, entity.ErrInjectableInUse) ||
		errors.Is(err, entity.ErrNoPublishedVersion) ||
		errors.Is(err, entity.ErrInvalidInjectableKey) ||
		errors.Is(err, entity.ErrRequiredField) ||
		errors.Is(err, entity.ErrFieldTooLong) ||
		errors.Is(err, entity.ErrInvalidDataType) ||
		errors.Is(err, entity.ErrCannotEditPublished) ||
		errors.Is(err, entity.ErrCannotEditArchived) ||
		errors.Is(err, entity.ErrVersionNotPublished) ||
		errors.Is(err, entity.ErrVersionAlreadyPublished) ||
		errors.Is(err, entity.ErrCannotArchiveWithoutReplacement) ||
		errors.Is(err, entity.ErrInvalidVersionStatus) ||
		errors.Is(err, entity.ErrInvalidVersionNumber) ||
		errors.Is(err, entity.ErrScheduledTimeInPast) ||
		errors.Is(err, entity.ErrFolderHasChildren) ||
		errors.Is(err, entity.ErrFolderHasTemplates) ||
		errors.Is(err, entity.ErrTagInUse) ||
		errors.Is(err, entity.ErrCircularReference) ||
		errors.Is(err, entity.ErrCannotArchiveSystem) ||
		errors.Is(err, entity.ErrInvalidParentFolder) ||
		errors.Is(err, entity.ErrCannotRemoveOwner) ||
		errors.Is(err, entity.ErrInvalidRole) ||
		errors.Is(err, entity.ErrInvalidTenantCode) ||
		errors.Is(err, entity.ErrInvalidWorkspaceType) ||
		errors.Is(err, entity.ErrInvalidSystemRole) ||
		errors.Is(err, entity.ErrMissingTenantID) ||
		errors.Is(err, entity.ErrCannotRemoveTenantOwner) ||
		errors.Is(err, entity.ErrInvalidTenantRole) ||
		errors.Is(err, entity.ErrVersionDoesNotBelongToTemplate) ||
		errors.Is(err, entity.ErrOnlyTextTypeAllowed) ||
		errors.Is(err, entity.ErrWorkspaceIDRequired) ||
		errors.Is(err, entity.ErrCannotModifyGlobal) ||
		errors.Is(err, entity.ErrDocumentTypeCodeImmutable) ||
		errors.Is(err, entity.ErrDocumentTypeHasTemplates)
}

// is403Error returns true if the error should result in a 403 Forbidden response.
func is403Error(err error) bool {
	return errors.Is(err, entity.ErrWorkspaceAccessDenied) ||
		errors.Is(err, entity.ErrForbidden) ||
		errors.Is(err, entity.ErrInsufficientRole) ||
		errors.Is(err, entity.ErrTenantAccessDenied)
}

// is401Error returns true if the error should result in a 401 Unauthorized response.
func is401Error(err error) bool {
	return errors.Is(err, entity.ErrUnauthorized) ||
		errors.Is(err, entity.ErrMissingAPIKey) ||
		errors.Is(err, entity.ErrInvalidAPIKey)
}

// is503Error returns true if the error should result in a 503 Service Unavailable response.
func is503Error(err error) bool {
	return errors.Is(err, entity.ErrLLMServiceUnavailable) ||
		errors.Is(err, entity.ErrRendererBusy)
}
