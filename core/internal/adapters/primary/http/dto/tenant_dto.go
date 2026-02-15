package dto

import (
	"errors"
	"time"
)

// TenantResponse represents a tenant in API responses.
type TenantResponse struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Code        string                 `json:"code"`
	Description string                 `json:"description,omitempty"`
	IsSystem    bool                   `json:"isSystem"`
	Status      string                 `json:"status"`
	Settings    map[string]interface{} `json:"settings,omitempty"`
	CreatedAt   time.Time              `json:"createdAt"`
	UpdatedAt   *time.Time             `json:"updatedAt,omitempty"`
}

// TenantWithRoleResponse represents a tenant with the user's role in API responses.
type TenantWithRoleResponse struct {
	ID             string                 `json:"id"`
	Name           string                 `json:"name"`
	Code           string                 `json:"code"`
	Description    string                 `json:"description,omitempty"`
	IsSystem       bool                   `json:"isSystem"`
	Status         string                 `json:"status"`
	Role           string                 `json:"role"`
	Settings       map[string]interface{} `json:"settings,omitempty"`
	CreatedAt      time.Time              `json:"createdAt"`
	UpdatedAt      *time.Time             `json:"updatedAt,omitempty"`
	LastAccessedAt *time.Time             `json:"lastAccessedAt,omitempty"`
}

// CreateTenantRequest represents a request to create a tenant.
type CreateTenantRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`
	Code        string `json:"code" binding:"required,min=2,max=10"`
	Description string `json:"description,omitempty" binding:"max=500"`
}

// UpdateTenantRequest represents a request to update a tenant.
type UpdateTenantRequest struct {
	Name        string                 `json:"name" binding:"required,min=1,max=100"`
	Description string                 `json:"description,omitempty" binding:"max=500"`
	Settings    map[string]interface{} `json:"settings,omitempty"`
}

// Validate validates the CreateTenantRequest.
func (r *CreateTenantRequest) Validate() error {
	if r.Name == "" {
		return ErrNameRequired
	}
	if len(r.Name) > 100 {
		return ErrNameTooLong
	}
	r.Code = normalizeCode(r.Code)
	if r.Code == "" || len(r.Code) < 2 || len(r.Code) > 10 {
		return ErrInvalidTenantCode
	}
	return nil
}

// Validate validates the UpdateTenantRequest.
func (r *UpdateTenantRequest) Validate() error {
	if r.Name == "" {
		return ErrNameRequired
	}
	if len(r.Name) > 100 {
		return ErrNameTooLong
	}
	return nil
}

// ErrInvalidTenantCode is returned when the tenant code is invalid.
var ErrInvalidTenantCode = ErrIDRequired // Reuse or define a specific error

// TenantListRequest represents a request to list tenants with pagination and optional search.
type TenantListRequest struct {
	Page    int    `form:"page,default=1"`
	PerPage int    `form:"perPage,default=10"`
	Query   string `form:"q"` // Optional search filter for name/code
}

// PaginatedTenantsResponse represents a paginated list of tenants.
type PaginatedTenantsResponse struct {
	Data       []*TenantResponse `json:"data"`
	Pagination PaginationMeta    `json:"pagination"`
}

// PaginatedTenantsWithRoleResponse represents a paginated list of tenants with roles.
type PaginatedTenantsWithRoleResponse struct {
	Data       []*TenantWithRoleResponse `json:"data"`
	Pagination PaginationMeta            `json:"pagination"`
}

// UpdateTenantStatusRequest represents a request to update a tenant's status.
type UpdateTenantStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=ACTIVE SUSPENDED ARCHIVED"`
}

// Validate validates the UpdateTenantStatusRequest.
func (r *UpdateTenantStatusRequest) Validate() error {
	switch r.Status {
	case "ACTIVE", "SUSPENDED", "ARCHIVED":
		return nil
	default:
		return ErrInvalidTenantStatus
	}
}

// ErrInvalidTenantStatus is returned when the tenant status is invalid.
var ErrInvalidTenantStatus = errors.New("status must be ACTIVE, SUSPENDED, or ARCHIVED")
