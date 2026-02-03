package port

import (
	"context"

	"github.com/rendis/pdf-forge/internal/core/entity"
)

// WorkspaceInjectableProvider defines the interface for dynamic workspace-specific injectables.
// Implementations are provided by users to supply custom injectables per workspace.
// The provider handles all i18n internally - returned labels and descriptions should be pre-translated.
type WorkspaceInjectableProvider interface {
	// GetInjectables returns available injectables for a workspace.
	// Called when editor opens to populate the injectable list.
	// Provider is responsible for i18n - return labels/descriptions already translated for the requested locale.
	GetInjectables(ctx context.Context, req *GetInjectablesRequest) (*GetInjectablesResult, error)

	// ResolveInjectables resolves a batch of injectable codes.
	// Called during render for workspace-specific injectables.
	//
	// Error handling:
	//   - Return (nil, error) for CRITICAL failures that should stop the render.
	//   - Return (result, nil) with result.Errors[code] for NON-CRITICAL failures (render continues).
	ResolveInjectables(ctx context.Context, req *ResolveInjectablesRequest) (*ResolveInjectablesResult, error)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET INJECTABLES (listing for editor)
// ─────────────────────────────────────────────────────────────────────────────

// GetInjectablesRequest contains parameters for fetching workspace injectables.
type GetInjectablesRequest struct {
	// TenantCode is the tenant identifier (e.g., "acme-corp").
	TenantCode string

	// WorkspaceCode is the workspace identifier within the tenant.
	WorkspaceCode string
}

// GetInjectablesResult contains the list of available injectables and groups.
type GetInjectablesResult struct {
	// Injectables is the list of available injectables for the workspace.
	Injectables []ProviderInjectable

	// Groups contains custom groups defined by the provider (optional).
	// These are merged with YAML-defined groups. Provider groups appear at the end.
	Groups []ProviderGroup
}

// ProviderInjectable represents an injectable definition from the provider.
type ProviderInjectable struct {
	// Code is the unique identifier for this injectable.
	// REQUIRED. Must not collide with registry-defined injector codes.
	Code string `json:"code" bson:"code"`

	// Label is the display name shown in the editor.
	// REQUIRED. Map of locale → translated label (e.g., {"es": "Nombre", "en": "Name"}).
	Label map[string]string `json:"label" bson:"label"`

	// Description is optional help text shown in the editor.
	// Map of locale → translated description.
	Description map[string]string `json:"description,omitempty" bson:"description,omitempty"`

	// DataType indicates the type of value this injectable produces.
	// REQUIRED. Use InjectableDataType constants: InjectableDataTypeText,
	// InjectableDataTypeNumber, InjectableDataTypeDate, InjectableDataTypeBoolean,
	// InjectableDataTypeImage, InjectableDataTypeTable, InjectableDataTypeList.
	DataType entity.InjectableDataType `json:"dataType" bson:"dataType"`

	// GroupKey is the key of the group to assign this injectable to (optional).
	// Can reference groups from ProviderGroups or existing YAML-defined groups.
	GroupKey string `json:"groupKey,omitempty" bson:"groupKey,omitempty"`

	// Formats defines available format options for this injectable (optional).
	// If empty, no format selection is shown in the editor.
	Formats []ProviderFormat `json:"formats,omitempty" bson:"formats,omitempty"`
}

// ProviderFormat represents a format option for an injectable.
type ProviderFormat struct {
	// Key is the format identifier (e.g., "DD/MM/YYYY", "HH:mm:ss").
	// This key is passed back in ResolveInjectablesRequest.SelectedFormats.
	Key string `json:"key" bson:"key"`

	// Label is the display label shown in the format selector.
	// Map of locale → translated label (e.g., {"es": "1.234,56", "en": "1,234.56"}).
	Label map[string]string `json:"label" bson:"label"`
}

// ProviderGroup represents a custom group for organizing injectables.
type ProviderGroup struct {
	// Key is the unique group identifier.
	// REQUIRED. Must be unique across YAML-defined groups.
	Key string `json:"key" bson:"key"`

	// Name is the display name shown in the editor.
	// REQUIRED. Map of locale → translated name (e.g., {"es": "Datos", "en": "Data"}).
	Name map[string]string `json:"name" bson:"name"`

	// Icon is the optional icon name (e.g., "calendar", "user", "database").
	Icon string `json:"icon,omitempty" bson:"icon,omitempty"`
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE INJECTABLES (resolution during render)
// ─────────────────────────────────────────────────────────────────────────────

// ResolveInjectablesRequest contains parameters for resolving injectable values.
type ResolveInjectablesRequest struct {
	// TenantCode is the tenant identifier.
	TenantCode string

	// WorkspaceCode is the workspace identifier.
	WorkspaceCode string

	// TemplateID is the ID of the template being rendered.
	TemplateID string

	// Codes is the list of injectable codes to resolve.
	// Only codes belonging to this provider are included.
	Codes []string

	// SelectedFormats maps injectable codes to their selected format keys.
	// Example: {"my_date": "DD/MM/YYYY", "my_time": "HH:mm"}
	SelectedFormats map[string]string

	// Headers contains HTTP headers from the original request.
	// Useful for extracting auth tokens or other context.
	Headers map[string]string

	// Payload contains the request body data.
	// Type depends on what was sent in the render request.
	Payload any

	// InitData contains shared initialization data from InitFunc.
	// Available if the user registered an InitFunc.
	InitData any
}

// ResolveInjectablesResult contains the resolved values and any non-critical errors.
type ResolveInjectablesResult struct {
	// Values maps injectable codes to their resolved values.
	// Use entity.StringValue(), entity.NumberValue(), etc. to create values.
	Values map[string]*entity.InjectableValue

	// Errors maps injectable codes to error messages for non-critical failures.
	// These injectables will use empty/default values and render will continue.
	// For critical failures that should stop the render, return an error from ResolveInjectables instead.
	Errors map[string]string
}
