package dto

// RoleEntry represents a single role assignment for the current user.
type RoleEntry struct {
	Type       string  `json:"type"`       // SYSTEM, TENANT, or WORKSPACE
	Role       string  `json:"role"`       // The specific role (e.g., SUPERADMIN, TENANT_OWNER, ADMIN)
	ResourceID *string `json:"resourceId"` // null for SYSTEM, UUID for TENANT/WORKSPACE
}

// MyRolesResponse represents the response for GET /api/v1/me/roles.
type MyRolesResponse struct {
	Roles []RoleEntry `json:"roles"`
}

// NewMyRolesResponse creates a new MyRolesResponse with the given roles.
func NewMyRolesResponse(roles []RoleEntry) MyRolesResponse {
	if roles == nil {
		roles = []RoleEntry{}
	}
	return MyRolesResponse{Roles: roles}
}
