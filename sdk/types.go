// Package sdk provides the public API for pdf-forge.
// Users interact exclusively with this package to configure and run the engine.
package sdk

import (
	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// Middleware is the function signature for HTTP middleware.
// Use with UseMiddleware() and UseAPIMiddleware().
type Middleware = gin.HandlerFunc

// Re-export types that extension authors need.
// Everything else stays internal.

// Injector defines the interface that users implement to provide custom injectable values.
type Injector = port.Injector

// ResolveFunc is the function signature for injector resolution.
type ResolveFunc = port.ResolveFunc

// InitFunc is the global initialization function that runs BEFORE all injectors.
type InitFunc = port.InitFunc

// RequestMapper defines the interface for mapping incoming requests.
type RequestMapper = port.RequestMapper

// MapperContext contains context data for request mapping.
type MapperContext = port.MapperContext

// TableSchemaProvider is an optional interface for table injectors to expose column schema.
type TableSchemaProvider = port.TableSchemaProvider

// ListSchemaProvider is an optional interface for list injectors to expose list schema.
type ListSchemaProvider = port.ListSchemaProvider

// InjectorContext encapsulates context data available to injectors.
type InjectorContext = entity.InjectorContext

// InjectorResult is the result of resolving an injector.
type InjectorResult = entity.InjectorResult

// InjectableValue is the typed value returned by an injector.
type InjectableValue = entity.InjectableValue

// ValueType indicates the type of an injectable value.
type ValueType = entity.ValueType

// FormatConfig defines formatting options for an injector.
type FormatConfig = entity.FormatConfig

// Table types
type (
	TableValue  = entity.TableValue
	TableColumn = entity.TableColumn
	TableRow    = entity.TableRow
	TableCell   = entity.TableCell
	TableStyles = entity.TableStyles
)

// List types
type (
	ListValue  = entity.ListValue
	ListItem   = entity.ListItem
	ListStyles = entity.ListStyles
	ListSymbol = entity.ListSymbol
	ListSchema = entity.ListSchema
)

// ValueType constants (used by Injectors)
const (
	ValueTypeString = entity.ValueTypeString
	ValueTypeNumber = entity.ValueTypeNumber
	ValueTypeBool   = entity.ValueTypeBool
	ValueTypeTime   = entity.ValueTypeTime
	ValueTypeTable  = entity.ValueTypeTable
	ValueTypeImage  = entity.ValueTypeImage
	ValueTypeList   = entity.ValueTypeList
)

// InjectableDataType represents the data type sent to frontend.
// Use these constants for ProviderInjectable.DataType.
type InjectableDataType = entity.InjectableDataType

// InjectableDataType constants (used by WorkspaceInjectableProvider)
const (
	InjectableDataTypeText     = entity.InjectableDataTypeText
	InjectableDataTypeNumber   = entity.InjectableDataTypeNumber
	InjectableDataTypeDate     = entity.InjectableDataTypeDate
	InjectableDataTypeCurrency = entity.InjectableDataTypeCurrency
	InjectableDataTypeBoolean  = entity.InjectableDataTypeBoolean
	InjectableDataTypeImage    = entity.InjectableDataTypeImage
	InjectableDataTypeTable    = entity.InjectableDataTypeTable
	InjectableDataTypeList     = entity.InjectableDataTypeList
)

// List symbol constants
const (
	ListSymbolBullet = entity.ListSymbolBullet
	ListSymbolNumber = entity.ListSymbolNumber
	ListSymbolDash   = entity.ListSymbolDash
	ListSymbolRoman  = entity.ListSymbolRoman
	ListSymbolLetter = entity.ListSymbolLetter
)

// Value constructors
var (
	StringValue    = entity.StringValue
	NumberValue    = entity.NumberValue
	BoolValue      = entity.BoolValue
	TimeValue      = entity.TimeValue
	TableValueData = entity.TableValueData
	ImageValue     = entity.ImageValue
	ListValueData  = entity.ListValueData
)

// Table helpers
var (
	NewTableValue = entity.NewTableValue
	Cell          = entity.Cell
	CellWithSpan  = entity.CellWithSpan
	EmptyCell     = entity.EmptyCell
)

// List helpers
var (
	NewListValue   = entity.NewListValue
	ListItemValue  = entity.ListItemValue
	ListItemNested = entity.ListItemNested
)

// Pointer helpers
var (
	StringPtr = entity.StringPtr
	IntPtr    = entity.IntPtr
)

// WorkspaceInjectableProvider types for dynamic workspace-specific injectables.
type (
	// WorkspaceInjectableProvider defines the interface for workspace-specific injectables.
	WorkspaceInjectableProvider = port.WorkspaceInjectableProvider

	// GetInjectablesResult contains the list of available injectables and groups.
	GetInjectablesResult = port.GetInjectablesResult

	// ProviderInjectable represents an injectable definition from the provider.
	ProviderInjectable = port.ProviderInjectable

	// ProviderFormat represents a format option for an injectable.
	ProviderFormat = port.ProviderFormat

	// ProviderGroup represents a custom group for organizing injectables.
	ProviderGroup = port.ProviderGroup

	// ResolveInjectablesRequest contains parameters for resolving injectable values.
	ResolveInjectablesRequest = port.ResolveInjectablesRequest

	// ResolveInjectablesResult contains the resolved values and any non-critical errors.
	ResolveInjectablesResult = port.ResolveInjectablesResult
)

// RenderAuthenticator types for custom render endpoint authentication.
type (
	RenderAuthenticator = port.RenderAuthenticator
	RenderAuthClaims    = port.RenderAuthClaims
)
