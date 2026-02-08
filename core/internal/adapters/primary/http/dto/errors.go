package dto

import "errors"

// Validation errors for DTOs.
var (
	// Common validation errors
	ErrNameRequired = errors.New("name is required")
	ErrNameTooLong  = errors.New("name exceeds maximum length of 255 characters")
	ErrIDRequired   = errors.New("id is required")

	// Workspace validation errors
	ErrInvalidWorkspaceType   = errors.New("type must be REGULAR or SYSTEM")
	ErrInvalidWorkspaceStatus = errors.New("status must be ACTIVE, SUSPENDED, or ARCHIVED")

	// Member validation errors
	ErrEmailRequired     = errors.New("email is required")
	ErrInvalidRole       = errors.New("role must be ADMIN, EDITOR, OPERATOR, or VIEWER")
	ErrInvalidTenantRole = errors.New("role must be TENANT_OWNER or TENANT_ADMIN")

	// Folder validation errors
	ErrInvalidParentID = errors.New("invalid parent folder ID")

	// Tag validation errors
	ErrInvalidColorFormat = errors.New("color must be a valid hex color (e.g., #FF0000)")
	ErrNameTooShort       = errors.New("name must be at least 3 characters")

	// Document Type validation errors
	ErrCodeRequired         = errors.New("code is required")
	ErrCodeTooLong          = errors.New("code exceeds maximum length of 50 characters")
	ErrCodeInvalidFormat    = errors.New("code must contain only uppercase letters, numbers, and underscores")
	ErrCodeConsecutiveUnder = errors.New("code cannot contain consecutive underscores")
	ErrCodeStartEndUnder    = errors.New("code cannot start or end with an underscore")

	// Access History validation errors
	ErrInvalidEntityType = errors.New("entityType must be TENANT or WORKSPACE")
)
