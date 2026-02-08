package entity

// TenantStatus represents the status of a tenant.
type TenantStatus string

const (
	TenantStatusActive    TenantStatus = "ACTIVE"
	TenantStatusSuspended TenantStatus = "SUSPENDED"
	TenantStatusArchived  TenantStatus = "ARCHIVED"
)

// IsValid checks if the tenant status is valid.
func (t TenantStatus) IsValid() bool {
	switch t {
	case TenantStatusActive, TenantStatusSuspended, TenantStatusArchived:
		return true
	}
	return false
}

// WorkspaceType represents the type of workspace.
type WorkspaceType string

const (
	WorkspaceTypeSystem WorkspaceType = "SYSTEM"
	WorkspaceTypeClient WorkspaceType = "CLIENT"
)

// IsValid checks if the workspace type is valid.
func (w WorkspaceType) IsValid() bool {
	switch w {
	case WorkspaceTypeSystem, WorkspaceTypeClient:
		return true
	}
	return false
}

// WorkspaceStatus represents the status of a workspace.
type WorkspaceStatus string

const (
	WorkspaceStatusActive    WorkspaceStatus = "ACTIVE"
	WorkspaceStatusSuspended WorkspaceStatus = "SUSPENDED"
	WorkspaceStatusArchived  WorkspaceStatus = "ARCHIVED"
)

// IsValid checks if the workspace status is valid.
func (w WorkspaceStatus) IsValid() bool {
	switch w {
	case WorkspaceStatusActive, WorkspaceStatusSuspended, WorkspaceStatusArchived:
		return true
	}
	return false
}

// UserStatus represents the status of a user account.
type UserStatus string

const (
	UserStatusInvited   UserStatus = "INVITED"
	UserStatusActive    UserStatus = "ACTIVE"
	UserStatusSuspended UserStatus = "SUSPENDED"
)

// IsValid checks if the user status is valid.
func (u UserStatus) IsValid() bool {
	switch u {
	case UserStatusInvited, UserStatusActive, UserStatusSuspended:
		return true
	}
	return false
}

// WorkspaceRole represents a user's role within a workspace.
type WorkspaceRole string

const (
	WorkspaceRoleOwner    WorkspaceRole = "OWNER"
	WorkspaceRoleAdmin    WorkspaceRole = "ADMIN"
	WorkspaceRoleEditor   WorkspaceRole = "EDITOR"
	WorkspaceRoleOperator WorkspaceRole = "OPERATOR"
	WorkspaceRoleViewer   WorkspaceRole = "VIEWER"
)

// IsValid checks if the workspace role is valid.
func (w WorkspaceRole) IsValid() bool {
	switch w {
	case WorkspaceRoleOwner, WorkspaceRoleAdmin, WorkspaceRoleEditor, WorkspaceRoleOperator, WorkspaceRoleViewer:
		return true
	}
	return false
}

// Weight returns the numeric weight of the role for permission comparisons.
// Higher weight = more permissions.
func (w WorkspaceRole) Weight() int {
	switch w {
	case WorkspaceRoleOwner:
		return 50
	case WorkspaceRoleAdmin:
		return 40
	case WorkspaceRoleEditor:
		return 30
	case WorkspaceRoleOperator:
		return 20
	case WorkspaceRoleViewer:
		return 10
	default:
		return 0
	}
}

// HasPermission checks if this role has at least the required role's permissions.
func (w WorkspaceRole) HasPermission(required WorkspaceRole) bool {
	return w.Weight() >= required.Weight()
}

// SystemRole represents a user's role at the platform level.
type SystemRole string

const (
	SystemRoleSuperAdmin    SystemRole = "SUPERADMIN"
	SystemRolePlatformAdmin SystemRole = "PLATFORM_ADMIN"
)

// IsValid checks if the system role is valid.
func (s SystemRole) IsValid() bool {
	switch s {
	case SystemRoleSuperAdmin, SystemRolePlatformAdmin:
		return true
	}
	return false
}

// Weight returns the numeric weight of the role for permission comparisons.
// Higher weight = more permissions.
func (s SystemRole) Weight() int {
	switch s {
	case SystemRoleSuperAdmin:
		return 100
	case SystemRolePlatformAdmin:
		return 90
	default:
		return 0
	}
}

// HasPermission checks if this role has at least the required role's permissions.
func (s SystemRole) HasPermission(required SystemRole) bool {
	return s.Weight() >= required.Weight()
}

// TenantRole represents a user's role within a specific tenant.
type TenantRole string

const (
	TenantRoleOwner TenantRole = "TENANT_OWNER"
	TenantRoleAdmin TenantRole = "TENANT_ADMIN"
)

// IsValid checks if the tenant role is valid.
func (t TenantRole) IsValid() bool {
	switch t {
	case TenantRoleOwner, TenantRoleAdmin:
		return true
	}
	return false
}

// Weight returns the numeric weight of the role for permission comparisons.
// Higher weight = more permissions.
func (t TenantRole) Weight() int {
	switch t {
	case TenantRoleOwner:
		return 60
	case TenantRoleAdmin:
		return 55
	default:
		return 0
	}
}

// HasPermission checks if this role has at least the required role's permissions.
func (t TenantRole) HasPermission(required TenantRole) bool {
	return t.Weight() >= required.Weight()
}

// MembershipStatus represents the status of a workspace membership.
type MembershipStatus string

const (
	MembershipStatusPending MembershipStatus = "PENDING"
	MembershipStatusActive  MembershipStatus = "ACTIVE"
)

// IsValid checks if the membership status is valid.
func (m MembershipStatus) IsValid() bool {
	switch m {
	case MembershipStatusPending, MembershipStatusActive:
		return true
	}
	return false
}

// InjectableDataType represents the data type of an injectable variable.
type InjectableDataType string

const (
	InjectableDataTypeText     InjectableDataType = "TEXT"
	InjectableDataTypeNumber   InjectableDataType = "NUMBER"
	InjectableDataTypeDate     InjectableDataType = "DATE"
	InjectableDataTypeCurrency InjectableDataType = "CURRENCY"
	InjectableDataTypeBoolean  InjectableDataType = "BOOLEAN"
	InjectableDataTypeImage    InjectableDataType = "IMAGE"
	InjectableDataTypeTable    InjectableDataType = "TABLE"
	InjectableDataTypeList     InjectableDataType = "LIST"
)

// IsValid checks if the injectable data type is valid.
func (i InjectableDataType) IsValid() bool {
	switch i {
	case InjectableDataTypeText, InjectableDataTypeNumber, InjectableDataTypeDate,
		InjectableDataTypeCurrency, InjectableDataTypeBoolean, InjectableDataTypeImage,
		InjectableDataTypeTable, InjectableDataTypeList:
		return true
	}
	return false
}

// InjectableSourceType indicates whether an injectable's value is calculated
// internally by the system or provided from an external source.
type InjectableSourceType string

const (
	InjectableSourceTypeInternal InjectableSourceType = "INTERNAL"
	InjectableSourceTypeExternal InjectableSourceType = "EXTERNAL"
)

// IsValid checks if the injectable source type is valid.
func (i InjectableSourceType) IsValid() bool {
	switch i {
	case InjectableSourceTypeInternal, InjectableSourceTypeExternal:
		return true
	}
	return false
}

// VersionStatus represents the lifecycle status of a template version.
type VersionStatus string

const (
	VersionStatusDraft     VersionStatus = "DRAFT"
	VersionStatusScheduled VersionStatus = "SCHEDULED"
	VersionStatusPublished VersionStatus = "PUBLISHED"
	VersionStatusArchived  VersionStatus = "ARCHIVED"
)

// IsValid checks if the version status is valid.
func (v VersionStatus) IsValid() bool {
	switch v {
	case VersionStatusDraft, VersionStatusScheduled, VersionStatusPublished, VersionStatusArchived:
		return true
	}
	return false
}

// String returns the string representation of the version status.
func (v VersionStatus) String() string {
	return string(v)
}

// CanTransitionTo checks if transition to target status is allowed.
func (v VersionStatus) CanTransitionTo(target VersionStatus) bool {
	switch v {
	case VersionStatusDraft:
		return target == VersionStatusScheduled || target == VersionStatusPublished
	case VersionStatusScheduled:
		return target == VersionStatusDraft || target == VersionStatusPublished
	case VersionStatusPublished:
		return target == VersionStatusArchived
	case VersionStatusArchived:
		return false
	}
	return false
}
