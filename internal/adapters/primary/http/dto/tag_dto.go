package dto

import (
	"regexp"
	"time"
)

// TagResponse represents a tag in API responses.
type TagResponse struct {
	ID          string     `json:"id"`
	WorkspaceID string     `json:"workspaceId"`
	Name        string     `json:"name"`
	Color       string     `json:"color"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty"`
}

// TagWithCountResponse includes the template count for the tag.
type TagWithCountResponse struct {
	TagResponse
	TemplateCount int `json:"templateCount"`
}

// CreateTagRequest represents a request to create a tag.
type CreateTagRequest struct {
	Name  string `json:"name" binding:"required,min=3,max=50"`
	Color string `json:"color" binding:"required"`
}

// UpdateTagRequest represents a request to update a tag.
type UpdateTagRequest struct {
	Name  string `json:"name" binding:"required,min=3,max=50"`
	Color string `json:"color" binding:"required"`
}

// hexColorRegex validates hex color format (#RRGGBB only, matching DB constraint).
var hexColorRegex = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// Validate validates the CreateTagRequest.
func (r *CreateTagRequest) Validate() error {
	if r.Name == "" {
		return ErrNameRequired
	}
	if len(r.Name) < 3 {
		return ErrNameTooShort
	}
	if len(r.Name) > 50 {
		return ErrNameTooLong
	}
	if !hexColorRegex.MatchString(r.Color) {
		return ErrInvalidColorFormat
	}
	return nil
}

// Validate validates the UpdateTagRequest.
func (r *UpdateTagRequest) Validate() error {
	if r.Name == "" {
		return ErrNameRequired
	}
	if len(r.Name) < 3 {
		return ErrNameTooShort
	}
	if len(r.Name) > 50 {
		return ErrNameTooLong
	}
	if !hexColorRegex.MatchString(r.Color) {
		return ErrInvalidColorFormat
	}
	return nil
}
