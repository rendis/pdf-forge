package entity

import (
	"time"
)

// Template represents a document blueprint (metadata only, content is in TemplateVersion).
type Template struct {
	ID              string     `json:"id"`
	WorkspaceID     string     `json:"workspaceId"`
	FolderID        *string    `json:"folderId,omitempty"`
	DocumentTypeID  *string    `json:"documentTypeId,omitempty"`
	Title           string     `json:"title"`
	IsPublicLibrary bool       `json:"isPublicLibrary"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       *time.Time `json:"updatedAt,omitempty"`
}

// NewTemplate creates a new template.
func NewTemplate(workspaceID string, folderID *string, title string) *Template {
	return &Template{
		WorkspaceID:     workspaceID,
		FolderID:        folderID,
		Title:           title,
		IsPublicLibrary: false,
		CreatedAt:       time.Now().UTC(),
	}
}

// Validate checks if the template data is valid.
func (t *Template) Validate() error {
	if t.WorkspaceID == "" {
		return ErrRequiredField
	}
	if t.Title == "" {
		return ErrRequiredField
	}
	if len(t.Title) > 255 {
		return ErrFieldTooLong
	}
	return nil
}

// TemplateTag represents the many-to-many relationship between templates and tags.
type TemplateTag struct {
	TemplateID string `json:"templateId"`
	TagID      string `json:"tagId"`
}

// TemplateListItem represents a template in list views (without version details).
type TemplateListItem struct {
	ID                     string     `json:"id"`
	WorkspaceID            string     `json:"workspaceId"`
	FolderID               *string    `json:"folderId,omitempty"`
	DocumentTypeID         *string    `json:"documentTypeId,omitempty"`
	DocumentTypeCode       *string    `json:"documentTypeCode,omitempty"`
	Title                  string     `json:"title"`
	IsPublicLibrary        bool       `json:"isPublicLibrary"`
	Tags                   []*Tag     `json:"tags"`
	HasPublishedVersion    bool       `json:"hasPublishedVersion"`
	VersionCount           int        `json:"versionCount"`
	ScheduledVersionCount  int        `json:"scheduledVersionCount"`
	PublishedVersionNumber *int       `json:"publishedVersionNumber,omitempty"`
	CreatedAt              time.Time  `json:"createdAt"`
	UpdatedAt              *time.Time `json:"updatedAt,omitempty"`
}
