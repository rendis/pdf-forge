package entity

import "time"

// InjectableScopeType represents the scope level for a system injectable assignment.
type InjectableScopeType string

const (
	InjectableScopePublic    InjectableScopeType = "PUBLIC"
	InjectableScopeTenant    InjectableScopeType = "TENANT"
	InjectableScopeWorkspace InjectableScopeType = "WORKSPACE"
)

// IsValid checks if the scope type is valid.
func (s InjectableScopeType) IsValid() bool {
	switch s {
	case InjectableScopePublic, InjectableScopeTenant, InjectableScopeWorkspace:
		return true
	default:
		return false
	}
}

// SystemInjectableInfo represents a system injector with its active state.
// Used for listing all available system injectors.
type SystemInjectableInfo struct {
	Key         string             `json:"key"`
	Label       map[string]string  `json:"label"`
	Description map[string]string  `json:"description"`
	DataType    InjectableDataType `json:"dataType"`
	Group       *string            `json:"group,omitempty"`
	IsActive    bool               `json:"isActive"`
	IsPublic    bool               `json:"isPublic"`
}

// SystemInjectableAssignment represents the assignment of a system injector to a scope.
type SystemInjectableAssignment struct {
	ID            string              `json:"id"`
	InjectableKey string              `json:"injectableKey"`
	ScopeType     InjectableScopeType `json:"scopeType"`
	TenantID      *string             `json:"tenantId,omitempty"`
	TenantName    *string             `json:"tenantName,omitempty"`
	WorkspaceID   *string             `json:"workspaceId,omitempty"`
	WorkspaceName *string             `json:"workspaceName,omitempty"`
	IsActive      bool                `json:"isActive"`
	CreatedAt     time.Time           `json:"createdAt"`
}

// Validate checks if the assignment data is valid.
func (a *SystemInjectableAssignment) Validate() error {
	if a.InjectableKey == "" {
		return ErrRequiredField
	}
	if !a.ScopeType.IsValid() {
		return ErrInvalidScopeType
	}

	switch a.ScopeType {
	case InjectableScopeTenant:
		if a.TenantID == nil {
			return ErrTenantIDRequired
		}
	case InjectableScopeWorkspace:
		if a.WorkspaceID == nil {
			return ErrWorkspaceIDRequired
		}
	case InjectableScopePublic:
		// No additional validation required
	}

	return nil
}
