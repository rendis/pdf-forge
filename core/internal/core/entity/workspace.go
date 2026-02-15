package entity

import (
	"strings"
	"time"
)

// Workspace is the root operational entity where all work happens.
// Every resource (templates, documents, users) belongs to a workspace.
type Workspace struct {
	ID             string          `json:"id"`
	TenantID       *string         `json:"tenantId,omitempty"` // NULL for global workspace
	Code           string          `json:"code"`
	Name           string          `json:"name"`
	Type           WorkspaceType   `json:"type"`
	Status         WorkspaceStatus `json:"status"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      *time.Time      `json:"updatedAt,omitempty"`
	LastAccessedAt *time.Time      `json:"-"` // Access metadata, not persisted
}

// NewWorkspace creates a new workspace with default status ACTIVE.
func NewWorkspace(tenantID *string, name string, wsType WorkspaceType) *Workspace {
	return &Workspace{
		TenantID:  tenantID,
		Name:      name,
		Type:      wsType,
		Status:    WorkspaceStatusActive,
		CreatedAt: time.Now().UTC(),
	}
}

// IsGlobal returns true if this is a global workspace (no tenant).
func (w *Workspace) IsGlobal() bool {
	return w.TenantID == nil
}

// IsSystem returns true if this is a system workspace.
func (w *Workspace) IsSystem() bool {
	return w.Type == WorkspaceTypeSystem
}

// IsActive returns true if the workspace is active.
func (w *Workspace) IsActive() bool {
	return w.Status == WorkspaceStatusActive
}

// CanAccess returns true if the workspace can be accessed (active status).
func (w *Workspace) CanAccess() error {
	switch w.Status {
	case WorkspaceStatusSuspended:
		return ErrWorkspaceSuspended
	case WorkspaceStatusArchived:
		return ErrWorkspaceArchived
	}
	return nil
}

// Validate checks if the workspace data is valid.
func (w *Workspace) Validate() error {
	if w.Name == "" || len(w.Name) < 3 {
		return ErrRequiredField
	}
	w.Code = strings.ToUpper(strings.TrimSpace(w.Code))
	if w.Code == "" {
		return ErrInvalidWorkspaceCode
	}
	if len(w.Code) < 2 || len(w.Code) > 50 {
		return ErrInvalidWorkspaceCode
	}
	if !w.Type.IsValid() {
		return ErrInvalidWorkspaceType
	}
	if !w.Status.IsValid() {
		return ErrInvalidWorkspaceStatus
	}
	// CLIENT workspaces must have a tenant
	if w.Type == WorkspaceTypeClient && w.TenantID == nil {
		return ErrInvalidWorkspaceType
	}
	return nil
}

// WorkspaceWithRole represents a workspace with the user's role in it.
// Used for listing workspaces a user has access to.
type WorkspaceWithRole struct {
	Workspace
	Role WorkspaceRole `json:"role"`
}
