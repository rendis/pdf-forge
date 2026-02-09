package sdk

import "github.com/rendis/pdf-forge/core/internal/core/port"

// ── Extension interfaces ────────────────────────────────────────────────────

// Injector defines the interface that users implement for custom injectable resolution.
type Injector = port.Injector

// RequestMapper defines the interface that users implement to map render requests.
type RequestMapper = port.RequestMapper

// WorkspaceInjectableProvider defines the interface for dynamic workspace-specific injectables.
type WorkspaceInjectableProvider = port.WorkspaceInjectableProvider

// RenderAuthenticator defines custom authentication for render endpoints.
type RenderAuthenticator = port.RenderAuthenticator

// TableSchemaProvider is an optional interface that table injectors can implement
// to expose their column structure at the API level.
type TableSchemaProvider = port.TableSchemaProvider

// ListSchemaProvider is an optional interface that list injectors can implement
// to expose their default configuration at the API level.
type ListSchemaProvider = port.ListSchemaProvider

// ── Function types ──────────────────────────────────────────────────────────

// ResolveFunc is the function that resolves the injector value.
type ResolveFunc = port.ResolveFunc

// InitFunc is the global initialization function that runs before all injectors.
type InitFunc = port.InitFunc

// ── Supporting structs ──────────────────────────────────────────────────────

// MapperContext contains the context for request mapping.
type MapperContext = port.MapperContext

// RenderAuthClaims contains authenticated caller information.
type RenderAuthClaims = port.RenderAuthClaims

// GetInjectablesResult contains the list of available injectables and groups.
type GetInjectablesResult = port.GetInjectablesResult

// ProviderInjectable represents an injectable definition from the provider.
type ProviderInjectable = port.ProviderInjectable

// ProviderFormat represents a format option for an injectable.
type ProviderFormat = port.ProviderFormat

// ProviderGroup represents a custom group for organizing injectables.
type ProviderGroup = port.ProviderGroup

// ResolveInjectablesRequest contains parameters for resolving injectable values.
type ResolveInjectablesRequest = port.ResolveInjectablesRequest

// ResolveInjectablesResult contains the resolved values and any non-critical errors.
type ResolveInjectablesResult = port.ResolveInjectablesResult
