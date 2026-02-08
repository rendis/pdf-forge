package dto

import "time"

// FolderResponse represents a folder in API responses.
type FolderResponse struct {
	ID               string     `json:"id"`
	WorkspaceID      string     `json:"workspaceId"`
	ParentID         *string    `json:"parentId,omitempty"`
	Name             string     `json:"name"`
	ChildFolderCount int        `json:"childFolderCount"`
	TemplateCount    int        `json:"templateCount"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        *time.Time `json:"updatedAt,omitempty"`
}

// FolderTreeResponse represents a folder with its children in a tree structure.
type FolderTreeResponse struct {
	ID          string                `json:"id"`
	WorkspaceID string                `json:"workspaceId"`
	ParentID    *string               `json:"parentId,omitempty"`
	Name        string                `json:"name"`
	CreatedAt   time.Time             `json:"createdAt"`
	UpdatedAt   *time.Time            `json:"updatedAt,omitempty"`
	Children    []*FolderTreeResponse `json:"children,omitempty"`
}

// FolderPathResponse represents the path from root to a folder.
type FolderPathResponse struct {
	Folders []FolderResponse `json:"folders"`
}

// CreateFolderRequest represents a request to create a folder.
type CreateFolderRequest struct {
	ParentID *string `json:"parentId,omitempty"`
	Name     string  `json:"name" binding:"required,min=1,max=255"`
}

// UpdateFolderRequest represents a request to update a folder.
type UpdateFolderRequest struct {
	Name string `json:"name" binding:"required,min=1,max=255"`
}

// MoveFolderRequest represents a request to move a folder.
type MoveFolderRequest struct {
	NewParentID *string `json:"newParentId"`
}

// Validate validates the CreateFolderRequest.
func (r *CreateFolderRequest) Validate() error {
	if r.Name == "" {
		return ErrNameRequired
	}
	if len(r.Name) > 255 {
		return ErrNameTooLong
	}
	return nil
}

// Validate validates the UpdateFolderRequest.
func (r *UpdateFolderRequest) Validate() error {
	if r.Name == "" {
		return ErrNameRequired
	}
	if len(r.Name) > 255 {
		return ErrNameTooLong
	}
	return nil
}
