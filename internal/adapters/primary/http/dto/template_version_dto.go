package dto

import (
	"encoding/json"
	"time"
)

// --- Template Version Response DTOs ---

// TemplateVersionResponse represents a template version in API responses (without content).
type TemplateVersionResponse struct {
	ID                 string     `json:"id"`
	TemplateID         string     `json:"templateId"`
	VersionNumber      int        `json:"versionNumber"`
	Name               string     `json:"name"`
	Description        *string    `json:"description,omitempty"`
	Status             string     `json:"status"`
	ScheduledPublishAt *time.Time `json:"scheduledPublishAt,omitempty"`
	ScheduledArchiveAt *time.Time `json:"scheduledArchiveAt,omitempty"`
	PublishedAt        *time.Time `json:"publishedAt,omitempty"`
	ArchivedAt         *time.Time `json:"archivedAt,omitempty"`
	PublishedBy        *string    `json:"publishedBy,omitempty"`
	ArchivedBy         *string    `json:"archivedBy,omitempty"`
	CreatedBy          *string    `json:"createdBy,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          *time.Time `json:"updatedAt,omitempty"`
}

// TemplateVersionDetailResponse represents a template version with full details.
type TemplateVersionDetailResponse struct {
	TemplateVersionResponse
	ContentStructure json.RawMessage                      `json:"contentStructure,omitempty"`
	Injectables      []*TemplateVersionInjectableResponse `json:"injectables,omitempty"`
}

// TemplateVersionSummaryResponse represents a template version summary (without content).
type TemplateVersionSummaryResponse struct {
	TemplateVersionResponse
	Injectables []*TemplateVersionInjectableResponse `json:"injectables,omitempty"`
}

// ListTemplateVersionsResponse represents a list of template versions.
type ListTemplateVersionsResponse struct {
	Items []*TemplateVersionResponse `json:"items"`
	Total int                        `json:"total"`
}

// TemplateVersionInjectableResponse represents a version injectable configuration.
type TemplateVersionInjectableResponse struct {
	ID                string              `json:"id"`
	TemplateVersionID string              `json:"templateVersionId"`
	IsRequired        bool                `json:"isRequired"`
	DefaultValue      *string             `json:"defaultValue,omitempty"`
	Definition        *InjectableResponse `json:"definition"`
	CreatedAt         time.Time           `json:"createdAt"`
}

// --- Template Version Request DTOs ---

// CreateVersionRequest represents the request to create a new template version.
type CreateVersionRequest struct {
	Name        string  `json:"name" binding:"required,min=1,max=100"`
	Description *string `json:"description,omitempty"`
}

// CreateVersionFromExistingRequest represents the request to create a version from an existing one.
type CreateVersionFromExistingRequest struct {
	SourceVersionID string  `json:"sourceVersionId" binding:"required,uuid"`
	Name            string  `json:"name" binding:"required,min=1,max=100"`
	Description     *string `json:"description,omitempty"`
}

// UpdateVersionRequest represents the request to update a template version.
type UpdateVersionRequest struct {
	Name             *string         `json:"name,omitempty" binding:"omitempty,min=1,max=100"`
	Description      *string         `json:"description,omitempty"`
	ContentStructure json.RawMessage `json:"contentStructure,omitempty"`
}

// SchedulePublishRequest represents the request to schedule version publication.
type SchedulePublishRequest struct {
	PublishAt time.Time `json:"publishAt" binding:"required"`
}

// ScheduleArchiveRequest represents the request to schedule version archival.
type ScheduleArchiveRequest struct {
	ArchiveAt time.Time `json:"archiveAt" binding:"required"`
}

// AddVersionInjectableRequest represents the request to add an injectable to a version.
type AddVersionInjectableRequest struct {
	InjectableDefinitionID string  `json:"injectableDefinitionId" binding:"required,uuid"`
	IsRequired             bool    `json:"isRequired"`
	DefaultValue           *string `json:"defaultValue,omitempty"`
}
