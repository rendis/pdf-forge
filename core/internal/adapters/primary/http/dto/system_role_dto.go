package dto

import (
	"errors"
	"time"
)

// SystemRoleResponse represents a system role assignment in API responses.
type SystemRoleResponse struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Role      string    `json:"role"`
	GrantedBy *string   `json:"grantedBy,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// SystemRoleWithUserResponse includes user details.
type SystemRoleWithUserResponse struct {
	SystemRoleResponse
	User *UserBriefResponse `json:"user"`
}

// UserBriefResponse represents minimal user info in API responses.
type UserBriefResponse struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"fullName"`
	Status   string `json:"status"`
}

// AssignSystemRoleRequest represents a request to assign a system role.
type AssignSystemRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=SUPERADMIN PLATFORM_ADMIN"`
}

// Validate validates the AssignSystemRoleRequest.
func (r *AssignSystemRoleRequest) Validate() error {
	validRoles := map[string]bool{
		"SUPERADMIN":     true,
		"PLATFORM_ADMIN": true,
	}
	if !validRoles[r.Role] {
		return ErrInvalidSystemRole
	}
	return nil
}

// ErrInvalidSystemRole is returned when the system role is invalid.
var ErrInvalidSystemRole = errors.New("role must be SUPERADMIN or PLATFORM_ADMIN")

// AssignSystemRoleByEmailRequest represents a request to assign a system role by email.
type AssignSystemRoleByEmailRequest struct {
	Email    string `json:"email" binding:"required,email"`
	FullName string `json:"fullName" binding:"required,max=255"`
	Role     string `json:"role" binding:"required,oneof=SUPERADMIN PLATFORM_ADMIN"`
}

// Validate validates the AssignSystemRoleByEmailRequest.
func (r *AssignSystemRoleByEmailRequest) Validate() error {
	if r.Email == "" {
		return errors.New("email is required")
	}
	validRoles := map[string]bool{
		"SUPERADMIN":     true,
		"PLATFORM_ADMIN": true,
	}
	if !validRoles[r.Role] {
		return ErrInvalidSystemRole
	}
	return nil
}
