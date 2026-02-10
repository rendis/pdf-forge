package dto

import (
	"encoding/json"
	"time"
)

// FormatConfigResponse represents format configuration in API responses.
type FormatConfigResponse struct {
	Default string   `json:"default"`
	Options []string `json:"options"`
}

// InjectableResponse represents an injectable definition in API responses.
type InjectableResponse struct {
	ID           string                `json:"id"`
	WorkspaceID  *string               `json:"workspaceId,omitempty"`
	Key          string                `json:"key"`
	Label        map[string]string     `json:"label"`
	Description  map[string]string     `json:"description,omitempty"`
	DataType     string                `json:"dataType"`
	SourceType   string                `json:"sourceType"`
	Metadata     map[string]any        `json:"metadata,omitempty"`
	FormatConfig *FormatConfigResponse `json:"formatConfig,omitempty"`
	Group        *string               `json:"group,omitempty"`
	IsGlobal     bool                  `json:"isGlobal"`
	CreatedAt    time.Time             `json:"createdAt"`
	UpdatedAt    *time.Time            `json:"updatedAt,omitempty"`
}

// GroupResponse represents an injectable group in API responses.
type GroupResponse struct {
	Key   string            `json:"key"`
	Name  map[string]string `json:"name"`
	Icon  string            `json:"icon"`
	Order int               `json:"order"`
}

// ListInjectablesResponse represents the list of injectables.
type ListInjectablesResponse struct {
	Items  []*InjectableResponse `json:"items"`
	Groups []*GroupResponse      `json:"groups"`
	Total  int                   `json:"total"`
}

// WorkspaceInjectableResponse represents a workspace-owned injectable in API responses.
type WorkspaceInjectableResponse struct {
	ID           string                `json:"id"`
	WorkspaceID  string                `json:"workspaceId"`
	Key          string                `json:"key"`
	Label        string                `json:"label"`
	Description  string                `json:"description,omitempty"`
	DataType     string                `json:"dataType"`
	SourceType   string                `json:"sourceType"`
	Metadata     map[string]any        `json:"metadata,omitempty"`
	FormatConfig *FormatConfigResponse `json:"formatConfig,omitempty"`
	DefaultValue *string               `json:"defaultValue,omitempty"`
	IsActive     bool                  `json:"isActive"`
	CreatedAt    time.Time             `json:"createdAt"`
	UpdatedAt    *time.Time            `json:"updatedAt,omitempty"`
}

// ListWorkspaceInjectablesResponse represents the list of workspace injectables.
type ListWorkspaceInjectablesResponse struct {
	Items []*WorkspaceInjectableResponse `json:"items"`
	Total int                            `json:"total"`
}

// CreateWorkspaceInjectableRequest represents the request to create a workspace injectable.
type CreateWorkspaceInjectableRequest struct {
	Key          string         `json:"key" binding:"required,min=1,max=100"`
	Label        string         `json:"label" binding:"required,min=1,max=255"`
	Description  string         `json:"description,omitempty"`
	DefaultValue string         `json:"defaultValue" binding:"required"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

// UpdateWorkspaceInjectableRequest represents the request to update a workspace injectable.
type UpdateWorkspaceInjectableRequest struct {
	Key          *string        `json:"key,omitempty" binding:"omitempty,min=1,max=100"`
	Label        *string        `json:"label,omitempty" binding:"omitempty,min=1,max=255"`
	Description  *string        `json:"description,omitempty"`
	DefaultValue *string        `json:"defaultValue,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

// TemplateResponse represents a template in API responses (metadata only).
type TemplateResponse struct {
	ID               string            `json:"id"`
	WorkspaceID      string            `json:"workspaceId"`
	FolderID         *string           `json:"folderId,omitempty"`
	DocumentTypeID   *string           `json:"documentTypeId,omitempty"`
	DocumentTypeName map[string]string `json:"documentTypeName,omitempty"`
	Title            string            `json:"title"`
	IsPublicLibrary  bool              `json:"isPublicLibrary"`
	CreatedAt        time.Time         `json:"createdAt"`
	UpdatedAt        *time.Time        `json:"updatedAt,omitempty"`
}

// TagSimpleResponse represents a simplified tag for list views.
type TagSimpleResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

// TemplateListItemResponse represents a template in list views.
type TemplateListItemResponse struct {
	ID                     string               `json:"id"`
	WorkspaceID            string               `json:"workspaceId"`
	FolderID               *string              `json:"folderId,omitempty"`
	DocumentTypeCode       *string              `json:"documentTypeCode,omitempty"`
	Title                  string               `json:"title"`
	IsPublicLibrary        bool                 `json:"isPublicLibrary"`
	HasPublishedVersion    bool                 `json:"hasPublishedVersion"`
	VersionCount           int                  `json:"versionCount"`
	ScheduledVersionCount  int                  `json:"scheduledVersionCount"`
	PublishedVersionNumber *int                 `json:"publishedVersionNumber,omitempty"`
	Tags                   []*TagSimpleResponse `json:"tags"`
	CreatedAt              time.Time            `json:"createdAt"`
	UpdatedAt              *time.Time           `json:"updatedAt,omitempty"`
}

// TemplateWithDetailsResponse represents a template with published version and metadata.
type TemplateWithDetailsResponse struct {
	TemplateResponse
	PublishedVersion *TemplateVersionDetailResponse `json:"publishedVersion,omitempty"`
	Tags             []*TagResponse                 `json:"tags,omitempty"`
	Folder           *FolderResponse                `json:"folder,omitempty"`
}

// TemplateWithAllVersionsResponse represents a template with all its versions.
type TemplateWithAllVersionsResponse struct {
	TemplateResponse
	Versions []*TemplateVersionSummaryResponse `json:"versions,omitempty"`
	Tags     []*TagResponse                    `json:"tags,omitempty"`
	Folder   *FolderResponse                   `json:"folder,omitempty"`
}

// TemplateCreateResponse represents the response when creating a template (with initial version).
type TemplateCreateResponse struct {
	Template       *TemplateResponse        `json:"template"`
	InitialVersion *TemplateVersionResponse `json:"initialVersion"`
}

// CreateTemplateRequest represents the request to create a template.
type CreateTemplateRequest struct {
	Title            string          `json:"title" binding:"required,min=1,max=255"`
	FolderID         *string         `json:"folderId,omitempty"`
	ContentStructure json.RawMessage `json:"contentStructure,omitempty"` // Initial content for the first version
	IsPublicLibrary  bool            `json:"isPublicLibrary"`
}

// UpdateTemplateRequest represents the request to update a template's metadata.
// All fields are optional to support partial updates.
type UpdateTemplateRequest struct {
	Title           *string `json:"title,omitempty" binding:"omitempty,min=1,max=255"`
	FolderID        *string `json:"folderId,omitempty"` // Use "root" to move template to root folder
	IsPublicLibrary *bool   `json:"isPublicLibrary,omitempty"`
}

// CloneTemplateRequest represents the request to clone a template.
type CloneTemplateRequest struct {
	NewTitle       string  `json:"newTitle" binding:"required,min=1,max=255"`
	VersionID      string  `json:"versionId" binding:"required"`
	TargetFolderID *string `json:"targetFolderId,omitempty"`
}

// ListTemplatesResponse represents the list of templates.
type ListTemplatesResponse struct {
	Items  []*TemplateListItemResponse `json:"items"`
	Total  int                         `json:"total"`
	Limit  int                         `json:"limit,omitempty"`
	Offset int                         `json:"offset,omitempty"`
}

// AddTagsRequest represents the request to add tags to a template.
type AddTagsRequest struct {
	TagIDs []string `json:"tagIds" binding:"required,min=1"`
}

// TemplateFiltersRequest represents filter parameters for listing templates.
type TemplateFiltersRequest struct {
	FolderID            *string  `form:"folderId"`
	HasPublishedVersion *bool    `form:"hasPublishedVersion"`
	TagIDs              []string `form:"tagIds"`
	Search              string   `form:"search"`
	Limit               int      `form:"limit,default=50"`
	Offset              int      `form:"offset,default=0"`
}
