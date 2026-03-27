package gallery

import (
	"context"
	"errors"
	"fmt"

	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// Gallery pagination and upload defaults.
const (
	DefaultPage    = 1
	DefaultPerPage = 20
	MaxUploadSize  = 10 << 20 // 10 MB
)

// Gallery validation errors used internally and mapped via the shared HTTP error handler.
var (
	ErrQueryRequired            = errors.New("query parameter 'q' is required")
	ErrAssetKeyRequired         = errors.New("query parameter 'key' is required")
	ErrUploadContentTypeInvalid = errors.New("invalid gallery upload content type")
	ErrUploadSizeInvalid        = errors.New("invalid gallery upload size")
	ErrUploadSizeTooLarge       = errors.New("gallery upload exceeds maximum size")
)

// Error wraps a gallery validation error while preserving a user-facing message.
type Error struct {
	cause   error
	message string
}

// NewError creates a new wrapped gallery error.
func NewError(cause error, format string, args ...any) error {
	return &Error{
		cause:   cause,
		message: fmt.Sprintf(format, args...),
	}
}

// Error implements error.
func (e *Error) Error() string {
	return e.message
}

// Unwrap exposes the underlying sentinel error for errors.Is checks.
func (e *Error) Unwrap() error {
	return e.cause
}

// ListCommand lists gallery assets within a storage scope.
type ListCommand struct {
	Storage port.StorageContext
	Page    int
	PerPage int
}

// SearchCommand searches gallery assets within a storage scope.
type SearchCommand struct {
	Storage port.StorageContext
	Query   string
	Page    int
	PerPage int
}

// InitUploadCommand initializes a gallery upload.
type InitUploadCommand struct {
	Storage     port.StorageContext
	Filename    string
	ContentType string
	Size        int64
	SHA256      string
}

// CompleteUploadCommand completes a gallery upload.
type CompleteUploadCommand struct {
	Storage  port.StorageContext
	UploadID string
}

// DeleteCommand deletes a gallery asset.
type DeleteCommand struct {
	Storage port.StorageContext
	Key     string
}

// GetURLCommand gets a URL for a gallery asset.
type GetURLCommand struct {
	Storage port.StorageContext
	Key     string
}

// GalleryUseCase defines the input port for gallery operations.
type GalleryUseCase interface {
	List(ctx context.Context, cmd ListCommand) (*port.StorageListResult, error)
	Search(ctx context.Context, cmd SearchCommand) (*port.StorageListResult, error)
	InitUpload(ctx context.Context, cmd InitUploadCommand) (*port.StorageInitUploadResult, error)
	CompleteUpload(ctx context.Context, cmd CompleteUploadCommand) (*port.StorageCompleteUploadResult, error)
	Delete(ctx context.Context, cmd DeleteCommand) error
	GetURL(ctx context.Context, cmd GetURLCommand) (*port.StorageGetURLResult, error)
}
