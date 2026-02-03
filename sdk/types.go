// Package sdk provides the public API for pdf-forge.
// Users interact exclusively with this package to configure and run the engine.
package sdk

import (
	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

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

// Value type constants
const (
	ValueTypeString = entity.ValueTypeString
	ValueTypeNumber = entity.ValueTypeNumber
	ValueTypeBool   = entity.ValueTypeBool
	ValueTypeTime   = entity.ValueTypeTime
	ValueTypeTable  = entity.ValueTypeTable
	ValueTypeImage  = entity.ValueTypeImage
	ValueTypeList   = entity.ValueTypeList
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
