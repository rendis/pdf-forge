package entity

import (
	"regexp"
	"time"
)

// injectableKeyRegex validates injectable key format (alphanumeric with underscores).
var injectableKeyRegex = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)

// InjectableDefinition represents a variable that can be injected into templates.
type InjectableDefinition struct {
	ID           string               `json:"id"`
	WorkspaceID  *string              `json:"workspaceId,omitempty"` // NULL for global definitions
	Key          string               `json:"key"`                   // Technical key (e.g., customer_name)
	Label        string               `json:"label"`                 // Human-readable name
	Description  string               `json:"description,omitempty"`
	DataType     InjectableDataType   `json:"dataType"`
	SourceType   InjectableSourceType `json:"sourceType"`             // INTERNAL (system-calculated) or EXTERNAL (user input)
	Metadata     map[string]any       `json:"metadata"`               // Flexible configuration (format options, etc.)
	FormatConfig *FormatConfig        `json:"formatConfig,omitempty"` // Formatting options for this injectable
	Group        *string              `json:"group,omitempty"`        // Group key for organizing in the editor (system injectables only)
	DefaultValue *string              `json:"defaultValue,omitempty"` // Default value for workspace injectables
	IsActive     bool                 `json:"isActive"`               // Enable/disable injectable
	IsDeleted    bool                 `json:"isDeleted"`              // Soft delete flag
	CreatedAt    time.Time            `json:"createdAt"`
	UpdatedAt    *time.Time           `json:"updatedAt,omitempty"`
}

// NewInjectableDefinition creates a new injectable definition.
func NewInjectableDefinition(workspaceID *string, key, label string, dataType InjectableDataType) *InjectableDefinition {
	return &InjectableDefinition{
		WorkspaceID: workspaceID,
		Key:         key,
		Label:       label,
		DataType:    dataType,
		SourceType:  InjectableSourceTypeInternal,
		Metadata:    make(map[string]any),
		IsActive:    true,
		IsDeleted:   false,
		CreatedAt:   time.Now().UTC(),
	}
}

// IsGlobal returns true if this is a global definition (available to all workspaces).
func (i *InjectableDefinition) IsGlobal() bool {
	return i.WorkspaceID == nil
}

// Validate checks if the injectable definition data is valid.
func (i *InjectableDefinition) Validate() error {
	if i.Key == "" {
		return ErrRequiredField
	}
	if !injectableKeyRegex.MatchString(i.Key) {
		return ErrInvalidInjectableKey
	}
	if len(i.Key) > 100 {
		return ErrFieldTooLong
	}
	if i.Label == "" {
		return ErrRequiredField
	}
	if len(i.Label) > 255 {
		return ErrFieldTooLong
	}
	if !i.DataType.IsValid() {
		return ErrInvalidDataType
	}
	return nil
}

// ValidateForWorkspace validates injectable for workspace-owned creation (TEXT type only).
func (i *InjectableDefinition) ValidateForWorkspace() error {
	if err := i.Validate(); err != nil {
		return err
	}
	if i.DataType != InjectableDataTypeText {
		return ErrOnlyTextTypeAllowed
	}
	if i.WorkspaceID == nil {
		return ErrWorkspaceIDRequired
	}
	return nil
}

// TemplateVersionInjectable represents the configuration of a variable within a specific template version.
// It can reference either a workspace injectable (via InjectableDefinitionID) or
// a system injectable (via SystemInjectableKey), but not both.
type TemplateVersionInjectable struct {
	ID                     string    `json:"id"`
	TemplateVersionID      string    `json:"templateVersionId"`
	InjectableDefinitionID *string   `json:"injectableDefinitionId,omitempty"` // For workspace injectables
	SystemInjectableKey    *string   `json:"systemInjectableKey,omitempty"`    // For system injectables (month_now, etc)
	IsRequired             bool      `json:"isRequired"`
	DefaultValue           *string   `json:"defaultValue,omitempty"`
	CreatedAt              time.Time `json:"createdAt"`
}

// NewTemplateVersionInjectable creates a new template version injectable configuration for workspace injectables.
func NewTemplateVersionInjectable(templateVersionID, injectableDefID string, isRequired bool, defaultValue *string) *TemplateVersionInjectable {
	return &TemplateVersionInjectable{
		TemplateVersionID:      templateVersionID,
		InjectableDefinitionID: &injectableDefID,
		IsRequired:             isRequired,
		DefaultValue:           defaultValue,
		CreatedAt:              time.Now().UTC(),
	}
}

// NewTemplateVersionInjectableFromSystemKey creates a new template version injectable for system injectables.
func NewTemplateVersionInjectableFromSystemKey(templateVersionID, systemKey string) *TemplateVersionInjectable {
	return &TemplateVersionInjectable{
		TemplateVersionID:   templateVersionID,
		SystemInjectableKey: &systemKey,
		IsRequired:          false,
		CreatedAt:           time.Now().UTC(),
	}
}

// Validate checks if the template version injectable data is valid.
// Either InjectableDefinitionID or SystemInjectableKey must be set, but not both.
func (tvi *TemplateVersionInjectable) Validate() error {
	if tvi.TemplateVersionID == "" {
		return ErrRequiredField
	}

	hasDefinitionID := tvi.InjectableDefinitionID != nil && *tvi.InjectableDefinitionID != ""
	hasSystemKey := tvi.SystemInjectableKey != nil && *tvi.SystemInjectableKey != ""

	if !hasDefinitionID && !hasSystemKey {
		return ErrRequiredField
	}
	if hasDefinitionID && hasSystemKey {
		return ErrInvalidInjectableSource
	}

	return nil
}

// IsSystemInjectable returns true if this references a system injectable.
func (tvi *TemplateVersionInjectable) IsSystemInjectable() bool {
	return tvi.SystemInjectableKey != nil && *tvi.SystemInjectableKey != ""
}

// GetKey returns the injectable key (either from definition or system key).
func (tvi *TemplateVersionInjectable) GetKey() string {
	if tvi.SystemInjectableKey != nil && *tvi.SystemInjectableKey != "" {
		return *tvi.SystemInjectableKey
	}
	return ""
}

// VersionInjectableWithDefinition combines a template version injectable with its definition.
type VersionInjectableWithDefinition struct {
	TemplateVersionInjectable
	Definition *InjectableDefinition `json:"definition"`
}
