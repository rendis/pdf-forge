package entity

import (
	"time"
)

// I18nText represents internationalized text as map[lang]text.
// Example: {"en": "Contract", "es": "Contrato"}
type I18nText map[string]string

// DocumentType represents a tenant-scoped document classification.
// Templates can be assigned to a document type for categorization.
// Each workspace can have at most one template per document type.
type DocumentType struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenantId"`
	Code        string     `json:"code"`        // Immutable, unique per tenant
	Name        I18nText   `json:"name"`        // {"en": "...", "es": "..."}
	Description I18nText   `json:"description"` // Optional
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty"`
}

// NewDocumentType creates a new document type.
func NewDocumentType(tenantID, code string, name, description I18nText) *DocumentType {
	return &DocumentType{
		TenantID:    tenantID,
		Code:        code,
		Name:        name,
		Description: description,
		CreatedAt:   time.Now().UTC(),
	}
}

// Validate checks if the document type data is valid.
func (d *DocumentType) Validate() error {
	if d.TenantID == "" {
		return ErrRequiredField
	}
	if d.Code == "" {
		return ErrRequiredField
	}
	if len(d.Code) > 50 {
		return ErrFieldTooLong
	}
	if len(d.Name) == 0 {
		return ErrRequiredField
	}
	// Check at least one name translation exists
	hasName := false
	for _, v := range d.Name {
		if v != "" {
			hasName = true
			break
		}
	}
	if !hasName {
		return ErrRequiredField
	}
	return nil
}

// GetName returns the name for the given locale with fallback to "en" or first available.
func (d *DocumentType) GetName(locale string) string {
	if name, ok := d.Name[locale]; ok && name != "" {
		return name
	}
	if name, ok := d.Name["en"]; ok && name != "" {
		return name
	}
	for _, name := range d.Name {
		if name != "" {
			return name
		}
	}
	return d.Code
}

// GetDescription returns the description for the given locale with fallback.
func (d *DocumentType) GetDescription(locale string) string {
	if desc, ok := d.Description[locale]; ok {
		return desc
	}
	if desc, ok := d.Description["en"]; ok {
		return desc
	}
	for _, desc := range d.Description {
		return desc
	}
	return ""
}

// DocumentTypeListItem represents a document type in list views.
type DocumentTypeListItem struct {
	ID             string     `json:"id"`
	TenantID       string     `json:"tenantId"`
	Code           string     `json:"code"`
	Name           I18nText   `json:"name"`
	Description    I18nText   `json:"description"`
	TemplatesCount int        `json:"templatesCount"` // Number of templates using this type
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      *time.Time `json:"updatedAt,omitempty"`
}

// DocumentTypeWithTemplates represents a document type with its assigned templates.
type DocumentTypeWithTemplates struct {
	DocumentType *DocumentType
	Templates    []*DocumentTypeTemplateInfo
}

// DocumentTypeTemplateInfo represents basic template info for document type context.
type DocumentTypeTemplateInfo struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	WorkspaceID   string `json:"workspaceId"`
	WorkspaceName string `json:"workspaceName"`
}
