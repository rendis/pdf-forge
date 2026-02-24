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

// TemplateResolver allows custom template version resolution for document-type render.
type TemplateResolver = port.TemplateResolver

// TemplateResolverRequest provides context for custom template resolution.
// Contains the original render request data including Environment (derived from
// the X-Environment header) to help decide which version status to search for.
// Use req.Environment.IsDev() to check for staging mode.
type TemplateResolverRequest = port.TemplateResolverRequest

// TemplateVersionSearchAdapter is the read-only adapter passed to custom resolvers.
type TemplateVersionSearchAdapter = port.TemplateVersionSearchAdapter

// TemplateVersionSearchParams are filters for searching candidate template versions.
// Staging takes precedence over Published when true (Published is ignored).
// See port.TemplateVersionSearchParams for the full behavior table.
//
// Note: TemplateResolverRequest now provides an Environment field instead of StagingMode.
// Use req.Environment.IsDev() to decide whether to set Staging=true in search params.
type TemplateVersionSearchParams = port.TemplateVersionSearchParams

// TemplateVersionSearchItem is one search result from SearchTemplateVersions.
// The VersionID can be returned directly from Resolve() to select this version.
type TemplateVersionSearchItem = port.TemplateVersionSearchItem

// TableSchemaProvider is an optional interface that table injectors can implement
// to expose their column structure at the API level.
type TableSchemaProvider = port.TableSchemaProvider

// ListSchemaProvider is an optional interface that list injectors can implement
// to expose their default configuration at the API level.
type ListSchemaProvider = port.ListSchemaProvider

// StorageProvider defines the interface for pluggable asset storage (image gallery).
type StorageProvider = port.StorageProvider

// StorageContext identifies the tenant and workspace for a storage operation.
type StorageContext = port.StorageContext

// StorageAsset represents a single stored file.
type StorageAsset = port.StorageAsset

// StorageListRequest is the input for StorageProvider.List.
type StorageListRequest = port.StorageListRequest

// StorageSearchRequest is the input for StorageProvider.Search.
type StorageSearchRequest = port.StorageSearchRequest

// StorageListResult is a paginated list of storage assets.
type StorageListResult = port.StorageListResult

// StorageInitUploadRequest is the input for StorageProvider.InitUpload.
type StorageInitUploadRequest = port.StorageInitUploadRequest

// StorageInitUploadResult is the output of StorageProvider.InitUpload.
type StorageInitUploadResult = port.StorageInitUploadResult

// StorageCompleteUploadRequest is the input for StorageProvider.CompleteUpload.
type StorageCompleteUploadRequest = port.StorageCompleteUploadRequest

// StorageCompleteUploadResult is the output of StorageProvider.CompleteUpload.
type StorageCompleteUploadResult = port.StorageCompleteUploadResult

// StorageDeleteRequest is the input for StorageProvider.Delete.
type StorageDeleteRequest = port.StorageDeleteRequest

// StorageGetURLRequest is the input for StorageProvider.GetURL.
type StorageGetURLRequest = port.StorageGetURLRequest

// StorageGetURLResult is the output of StorageProvider.GetURL.
type StorageGetURLResult = port.StorageGetURLResult

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
