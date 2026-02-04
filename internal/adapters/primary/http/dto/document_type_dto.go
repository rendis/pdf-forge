package dto

import (
	"regexp"
	"strings"
	"time"
)

// codeRegex validates document type codes:
// - Only uppercase letters, numbers, and underscores
// - Segments separated by single underscores
// Valid: CODE, CODE_V2, MY_CODE_123
// Invalid: _CODE, CODE_, __CODE, CODE__V2
var codeRegex = regexp.MustCompile(`^[A-Z0-9]+(_[A-Z0-9]+)*$`)

// normalizeCode transforms input into a valid code format:
// - Converts to uppercase
// - Replaces spaces with underscores
// - Removes invalid characters (keeps only A-Z, 0-9, _)
// - Removes consecutive underscores
// - Removes leading and trailing underscores
func normalizeCode(code string) string {
	// Uppercase
	code = strings.ToUpper(code)
	// Spaces to underscore
	code = strings.ReplaceAll(code, " ", "_")
	// Remove invalid characters (keep only A-Z, 0-9, _)
	var result strings.Builder
	for _, r := range code {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			result.WriteRune(r)
		}
	}
	code = result.String()
	// Remove consecutive underscores
	for strings.Contains(code, "__") {
		code = strings.ReplaceAll(code, "__", "_")
	}
	// Remove leading and trailing underscores
	code = strings.Trim(code, "_")
	return code
}

// validateCode checks if a code meets all requirements.
func validateCode(code string) error {
	if code == "" {
		return ErrCodeRequired
	}
	if len(code) > 50 {
		return ErrCodeTooLong
	}
	// Check for consecutive underscores
	if strings.Contains(code, "__") {
		return ErrCodeConsecutiveUnder
	}
	// Check leading/trailing underscore
	if strings.HasPrefix(code, "_") || strings.HasSuffix(code, "_") {
		return ErrCodeStartEndUnder
	}
	// Check valid characters (only uppercase, numbers, underscore)
	if !codeRegex.MatchString(code) {
		return ErrCodeInvalidFormat
	}
	return nil
}

// DocumentTypeResponse represents a document type in API responses.
type DocumentTypeResponse struct {
	ID          string            `json:"id"`
	TenantID    string            `json:"tenantId"`
	Code        string            `json:"code"`
	Name        map[string]string `json:"name"`
	Description map[string]string `json:"description,omitempty"`
	IsGlobal    bool              `json:"isGlobal"` // True if from SYS tenant (read-only for other tenants)
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   *time.Time        `json:"updatedAt,omitempty"`
}

// DocumentTypeListItemResponse includes the template count.
type DocumentTypeListItemResponse struct {
	DocumentTypeResponse
	TemplatesCount int `json:"templatesCount"`
}

// DocumentTypeTemplateInfoResponse represents template info in document type context.
type DocumentTypeTemplateInfoResponse struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	WorkspaceID   string `json:"workspaceId"`
	WorkspaceName string `json:"workspaceName"`
}

// CreateDocumentTypeRequest represents a request to create a document type.
type CreateDocumentTypeRequest struct {
	Code        string            `json:"code" binding:"required,min=1,max=50"`
	Name        map[string]string `json:"name" binding:"required"`
	Description map[string]string `json:"description"`
}

// UpdateDocumentTypeRequest represents a request to update a document type.
type UpdateDocumentTypeRequest struct {
	Name        map[string]string `json:"name" binding:"required"`
	Description map[string]string `json:"description"`
}

// DeleteDocumentTypeRequest represents a request to delete a document type.
type DeleteDocumentTypeRequest struct {
	Force         bool    `json:"force"`                   // Delete even if templates are assigned
	ReplaceWithID *string `json:"replaceWithId,omitempty"` // Replace with another type before deleting
}

// DeleteDocumentTypeResponse represents the result of a delete attempt.
type DeleteDocumentTypeResponse struct {
	Deleted    bool                                `json:"deleted"`
	Templates  []*DocumentTypeTemplateInfoResponse `json:"templates,omitempty"`  // Templates using this type (if not deleted)
	CanReplace bool                                `json:"canReplace,omitempty"` // True if replacement is possible
}

// DocumentTypeListRequest represents query params for listing document types.
type DocumentTypeListRequest struct {
	Page    int    `form:"page,default=1"`
	PerPage int    `form:"perPage,default=10"`
	Query   string `form:"q"`
}

// PaginatedDocumentTypesResponse represents a paginated list of document types.
type PaginatedDocumentTypesResponse struct {
	Data       []*DocumentTypeListItemResponse `json:"data"`
	Pagination PaginationMeta                  `json:"pagination"`
}

// AssignDocumentTypeRequest represents a request to assign/unassign a document type.
type AssignDocumentTypeRequest struct {
	DocumentTypeID *string `json:"documentTypeId"` // nil to unassign
	Force          bool    `json:"force"`          // true = reassign even if type is used by another template
}

// AssignDocumentTypeResponse represents the result of assigning a document type.
type AssignDocumentTypeResponse struct {
	Template *TemplateResponse     `json:"template,omitempty"`
	Conflict *TemplateConflictInfo `json:"conflict,omitempty"`
}

// TemplateConflictInfo represents info about a conflicting template.
type TemplateConflictInfo struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// Validate validates the CreateDocumentTypeRequest.
// It normalizes the code (uppercase, spaces to underscores, remove invalid chars)
// and then validates it meets all requirements.
func (r *CreateDocumentTypeRequest) Validate() error {
	// Normalize code (spaces → _, uppercase, remove invalid chars)
	r.Code = normalizeCode(r.Code)

	// Validate code
	if err := validateCode(r.Code); err != nil {
		return err
	}

	// Validate name
	if len(r.Name) == 0 {
		return ErrNameRequired
	}
	// Check at least one name translation exists
	hasName := false
	for _, v := range r.Name {
		if v != "" {
			hasName = true
			break
		}
	}
	if !hasName {
		return ErrNameRequired
	}
	return nil
}

// Validate validates the UpdateDocumentTypeRequest.
func (r *UpdateDocumentTypeRequest) Validate() error {
	if len(r.Name) == 0 {
		return ErrNameRequired
	}
	hasName := false
	for _, v := range r.Name {
		if v != "" {
			hasName = true
			break
		}
	}
	if !hasName {
		return ErrNameRequired
	}
	return nil
}
