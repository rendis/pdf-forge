package entity

import "time"

// User represents a shadow user record that mirrors external IdP accounts.
// Authentication is delegated to the OIDC provider; this record is for internal
// role management and audit trails.
type User struct {
	ID                 string     `json:"id"`
	Email              string     `json:"email"`
	ExternalIdentityID *string    `json:"externalIdentityId,omitempty"` // OIDC sub claim
	FullName           string     `json:"fullName,omitempty"`
	Status             UserStatus `json:"status"`
	CreatedAt          time.Time  `json:"createdAt"`
}

// NewUser creates a new user with INVITED status.
func NewUser(email, fullName string) *User {
	return &User{
		Email:     email,
		FullName:  fullName,
		Status:    UserStatusInvited,
		CreatedAt: time.Now().UTC(),
	}
}

// IsActive returns true if the user is active.
func (u *User) IsActive() bool {
	return u.Status == UserStatusActive
}

// IsLinkedToIdP returns true if the user has logged in via IdP.
func (u *User) IsLinkedToIdP() bool {
	return u.ExternalIdentityID != nil
}

// CanAccess returns an error if the user cannot access resources.
func (u *User) CanAccess() error {
	if u.Status == UserStatusSuspended {
		return ErrUserSuspended
	}
	return nil
}

// Activate activates the user and links to IdP.
func (u *User) Activate(externalID string) {
	u.ExternalIdentityID = &externalID
	u.Status = UserStatusActive
}

// Validate checks if the user data is valid.
func (u *User) Validate() error {
	if u.Email == "" {
		return ErrInvalidEmail
	}
	if !u.Status.IsValid() {
		return ErrInvalidUserStatus
	}
	return nil
}

// WorkspaceMember represents a user's membership in a workspace with a specific role.
type WorkspaceMember struct {
	ID               string           `json:"id"`
	WorkspaceID      string           `json:"workspaceId"`
	UserID           string           `json:"userId"`
	Role             WorkspaceRole    `json:"role"`
	MembershipStatus MembershipStatus `json:"membershipStatus"`
	InvitedBy        *string          `json:"invitedBy,omitempty"`
	JoinedAt         *time.Time       `json:"joinedAt,omitempty"`
	CreatedAt        time.Time        `json:"createdAt"`
}

// NewWorkspaceMember creates a new pending membership.
func NewWorkspaceMember(workspaceID, userID string, role WorkspaceRole, invitedBy *string) *WorkspaceMember {
	return &WorkspaceMember{
		WorkspaceID:      workspaceID,
		UserID:           userID,
		Role:             role,
		MembershipStatus: MembershipStatusPending,
		InvitedBy:        invitedBy,
		CreatedAt:        time.Now().UTC(),
	}
}

// NewActiveMember creates an immediately active membership.
func NewActiveMember(workspaceID, userID string, role WorkspaceRole) *WorkspaceMember {
	now := time.Now().UTC()
	return &WorkspaceMember{
		WorkspaceID:      workspaceID,
		UserID:           userID,
		Role:             role,
		MembershipStatus: MembershipStatusActive,
		JoinedAt:         &now,
		CreatedAt:        now,
	}
}

// IsActive returns true if the membership is active.
func (m *WorkspaceMember) IsActive() bool {
	return m.MembershipStatus == MembershipStatusActive
}

// Activate activates a pending membership.
func (m *WorkspaceMember) Activate() {
	now := time.Now().UTC()
	m.MembershipStatus = MembershipStatusActive
	m.JoinedAt = &now
}

// HasPermission checks if the member has at least the required role.
func (m *WorkspaceMember) HasPermission(required WorkspaceRole) bool {
	return m.Role.HasPermission(required)
}

// Validate checks if the membership data is valid.
func (m *WorkspaceMember) Validate() error {
	if m.WorkspaceID == "" || m.UserID == "" {
		return ErrRequiredField
	}
	if !m.Role.IsValid() {
		return ErrInvalidRole
	}
	if !m.MembershipStatus.IsValid() {
		return ErrInvalidMembershipStatus
	}
	return nil
}

// MemberWithUser represents a workspace member with full user details.
type MemberWithUser struct {
	WorkspaceMember
	User *User `json:"user"`
}

// SystemRoleAssignment represents a user's system-level role assignment.
type SystemRoleAssignment struct {
	ID        string     `json:"id"`
	UserID    string     `json:"userId"`
	Role      SystemRole `json:"role"`
	GrantedBy *string    `json:"grantedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

// SystemRoleWithUser represents a system role assignment with full user details.
type SystemRoleWithUser struct {
	SystemRoleAssignment
	User *User `json:"user"`
}

// NewSystemRoleAssignment creates a new system role assignment.
func NewSystemRoleAssignment(userID string, role SystemRole, grantedBy *string) *SystemRoleAssignment {
	return &SystemRoleAssignment{
		UserID:    userID,
		Role:      role,
		GrantedBy: grantedBy,
		CreatedAt: time.Now().UTC(),
	}
}

// HasPermission checks if the assignment has at least the required role.
func (s *SystemRoleAssignment) HasPermission(required SystemRole) bool {
	return s.Role.HasPermission(required)
}

// Validate checks if the system role assignment data is valid.
func (s *SystemRoleAssignment) Validate() error {
	if s.UserID == "" {
		return ErrRequiredField
	}
	if !s.Role.IsValid() {
		return ErrInvalidSystemRole
	}
	return nil
}

// TenantMember represents a user's membership in a tenant with a specific role.
type TenantMember struct {
	ID               string           `json:"id"`
	TenantID         string           `json:"tenantId"`
	UserID           string           `json:"userId"`
	Role             TenantRole       `json:"role"`
	MembershipStatus MembershipStatus `json:"membershipStatus"`
	GrantedBy        *string          `json:"grantedBy,omitempty"`
	CreatedAt        time.Time        `json:"createdAt"`
}

// NewTenantMember creates a new active tenant membership.
func NewTenantMember(tenantID, userID string, role TenantRole, grantedBy *string) *TenantMember {
	return &TenantMember{
		TenantID:         tenantID,
		UserID:           userID,
		Role:             role,
		MembershipStatus: MembershipStatusActive,
		GrantedBy:        grantedBy,
		CreatedAt:        time.Now().UTC(),
	}
}

// IsActive returns true if the tenant membership is active.
func (t *TenantMember) IsActive() bool {
	return t.MembershipStatus == MembershipStatusActive
}

// HasPermission checks if the member has at least the required role.
func (t *TenantMember) HasPermission(required TenantRole) bool {
	return t.Role.HasPermission(required)
}

// Validate checks if the tenant member data is valid.
func (t *TenantMember) Validate() error {
	if t.TenantID == "" || t.UserID == "" {
		return ErrRequiredField
	}
	if !t.Role.IsValid() {
		return ErrInvalidTenantRole
	}
	if !t.MembershipStatus.IsValid() {
		return ErrInvalidMembershipStatus
	}
	return nil
}

// TenantMemberWithUser represents a tenant member with full user details.
type TenantMemberWithUser struct {
	TenantMember
	User *User `json:"user"`
}

// TenantWithRole represents a tenant with the user's role in it.
type TenantWithRole struct {
	Tenant         *Tenant    `json:"tenant"`
	Role           TenantRole `json:"role"`
	LastAccessedAt *time.Time `json:"lastAccessedAt,omitempty"`
}
