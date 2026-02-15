package entity

import (
	"strings"
	"time"
)

// Tenant represents a jurisdiction, country, or major business unit.
// It groups multiple workspaces together and provides regional configuration.
// The system tenant (IsSystem=true) is a special tenant that holds global templates.
type Tenant struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Code        string         `json:"code"`
	Description string         `json:"description,omitempty"`
	IsSystem    bool           `json:"isSystem"`
	Status      TenantStatus   `json:"status"`
	Settings    TenantSettings `json:"settings"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   *time.Time     `json:"updatedAt,omitempty"`
}

// TenantSettings holds tenant-specific regional configuration.
type TenantSettings struct {
	Currency   string `json:"currency,omitempty"`
	Timezone   string `json:"timezone,omitempty"`
	DateFormat string `json:"dateFormat,omitempty"`
	Locale     string `json:"locale,omitempty"`
}

// NewTenant creates a new tenant with the given name, code and description.
func NewTenant(name, code, description string, settings TenantSettings) *Tenant {
	return &Tenant{
		Name:        name,
		Code:        code,
		Description: description,
		Status:      TenantStatusActive,
		Settings:    settings,
		CreatedAt:   time.Now().UTC(),
	}
}

// Validate checks if the tenant data is valid.
func (t *Tenant) Validate() error {
	if t.Name == "" {
		return ErrRequiredField
	}
	if len(t.Name) > 100 {
		return ErrFieldTooLong
	}
	t.Code = strings.ToUpper(strings.TrimSpace(t.Code))
	if t.Code == "" {
		return ErrInvalidTenantCode
	}
	if len(t.Code) > 10 {
		return ErrFieldTooLong
	}
	if len(t.Description) > 500 {
		return ErrFieldTooLong
	}
	return nil
}
