package dto

import (
	"time"
)

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
