package dto

import "time"

// ErrorResponse represents a standard error response.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
	Code    string `json:"code,omitempty"`
}

// ValidationError represents a field-level validation error.
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationErrorResponse represents a response with validation errors.
type ValidationErrorResponse struct {
	Error  string            `json:"error"`
	Errors []ValidationError `json:"errors"`
}

// SuccessResponse represents a generic success response.
type SuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// IDResponse represents a response containing just an ID.
type IDResponse struct {
	ID string `json:"id"`
}

// PaginationMeta contains pagination metadata.
type PaginationMeta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"perPage"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
}

// PaginatedResponse wraps a paginated list response.
type PaginatedResponse[T any] struct {
	Data       []T            `json:"data"`
	Pagination PaginationMeta `json:"pagination"`
}

// ListResponse wraps a simple list response without pagination.
type ListResponse[T any] struct {
	Data  []T `json:"data"`
	Count int `json:"count"`
}

// TimestampResponse represents common timestamp fields.
type TimestampResponse struct {
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty"`
}

// NewErrorResponse creates a new error response.
func NewErrorResponse(err error) ErrorResponse {
	return ErrorResponse{
		Error: err.Error(),
	}
}

// NewErrorResponseWithMessage creates an error response with a custom message.
func NewErrorResponseWithMessage(err error, message string) ErrorResponse {
	return ErrorResponse{
		Error:   err.Error(),
		Message: message,
	}
}

// NewSuccessResponse creates a new success response.
func NewSuccessResponse(message string) SuccessResponse {
	return SuccessResponse{
		Success: true,
		Message: message,
	}
}

// NewIDResponse creates a new ID response.
func NewIDResponse(id string) IDResponse {
	return IDResponse{ID: id}
}

// NewListResponse creates a new list response.
func NewListResponse[T any](data []T) ListResponse[T] {
	if data == nil {
		data = []T{}
	}
	return ListResponse[T]{
		Data:  data,
		Count: len(data),
	}
}
