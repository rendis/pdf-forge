package entity

import "time"

// AccessEntityType represents the type of entity being accessed.
type AccessEntityType string

const (
	AccessEntityTypeTenant    AccessEntityType = "TENANT"
	AccessEntityTypeWorkspace AccessEntityType = "WORKSPACE"
)

// IsValid checks if the entity type is valid.
func (t AccessEntityType) IsValid() bool {
	return t == AccessEntityTypeTenant || t == AccessEntityTypeWorkspace
}

// UserAccessHistory represents a record of user's recent access to a resource.
type UserAccessHistory struct {
	ID         string           `json:"id"`
	UserID     string           `json:"userId"`
	EntityType AccessEntityType `json:"entityType"`
	EntityID   string           `json:"entityId"`
	AccessedAt time.Time        `json:"accessedAt"`
}

// NewUserAccessHistory creates a new access history record.
func NewUserAccessHistory(userID string, entityType AccessEntityType, entityID string) *UserAccessHistory {
	return &UserAccessHistory{
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		AccessedAt: time.Now().UTC(),
	}
}

// Validate checks if the access history record is valid.
func (h *UserAccessHistory) Validate() error {
	if h.UserID == "" || h.EntityID == "" {
		return ErrRequiredField
	}
	if !h.EntityType.IsValid() {
		return ErrInvalidAccessEntityType
	}
	return nil
}
