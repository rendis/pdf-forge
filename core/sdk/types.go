package sdk

import "github.com/rendis/pdf-forge/internal/core/entity"

// ── Core types ──────────────────────────────────────────────────────────────

// InjectorContext encapsulates request context data with thread-safe access.
type InjectorContext = entity.InjectorContext

// InjectorResult is the result of resolving an injector.
type InjectorResult = entity.InjectorResult

// InjectableValue is the typed value returned by an injector.
type InjectableValue = entity.InjectableValue

// ValueType indicates the type of an injectable value.
type ValueType = entity.ValueType

// InjectableDataType represents the data type of an injectable variable.
type InjectableDataType = entity.InjectableDataType

// FormatConfig defines formatting options for an injector.
type FormatConfig = entity.FormatConfig

// ── ValueType constants ─────────────────────────────────────────────────────

const (
	ValueTypeString = entity.ValueTypeString
	ValueTypeNumber = entity.ValueTypeNumber
	ValueTypeBool   = entity.ValueTypeBool
	ValueTypeTime   = entity.ValueTypeTime
	ValueTypeTable  = entity.ValueTypeTable
	ValueTypeImage  = entity.ValueTypeImage
	ValueTypeList   = entity.ValueTypeList
)

// ── InjectableDataType constants ────────────────────────────────────────────

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

// ── Value constructors ──────────────────────────────────────────────────────

var (
	StringValue    = entity.StringValue
	NumberValue    = entity.NumberValue
	BoolValue      = entity.BoolValue
	TimeValue      = entity.TimeValue
	ImageValue     = entity.ImageValue
	TableValueData = entity.TableValueData
	ListValueData  = entity.ListValueData
)

// ── Table types ─────────────────────────────────────────────────────────────

// TableValue represents a complete table with columns, rows, and styling.
type TableValue = entity.TableValue

// TableColumn defines a column in a dynamic table.
type TableColumn = entity.TableColumn

// TableCell represents a single cell in a table row.
type TableCell = entity.TableCell

// TableRow represents a row of cells in a table.
type TableRow = entity.TableRow

// TableStyles defines styling options for table headers and body content.
type TableStyles = entity.TableStyles

// Table constructors and helpers.
var (
	NewTableValue = entity.NewTableValue
	Cell          = entity.Cell
	CellWithSpan  = entity.CellWithSpan
	EmptyCell     = entity.EmptyCell
)

// ── List types ──────────────────────────────────────────────────────────────

// ListValue represents a complete injectable list with items and styling.
type ListValue = entity.ListValue

// ListSchema exposes the default configuration of a list injector to the frontend.
type ListSchema = entity.ListSchema

// ListSymbol represents the marker/numbering style for a list.
type ListSymbol = entity.ListSymbol

// ListStyles defines styling options for list header or items.
type ListStyles = entity.ListStyles

// ListItem represents a single item in a list, optionally with nested children.
type ListItem = entity.ListItem

// ListSymbol constants.
const (
	ListSymbolBullet = entity.ListSymbolBullet
	ListSymbolNumber = entity.ListSymbolNumber
	ListSymbolDash   = entity.ListSymbolDash
	ListSymbolRoman  = entity.ListSymbolRoman
	ListSymbolLetter = entity.ListSymbolLetter
)

// List constructors and helpers.
var (
	NewListValue    = entity.NewListValue
	ListItemValue   = entity.ListItemValue
	ListItemNested  = entity.ListItemNested
)

// ── Pointer helpers ─────────────────────────────────────────────────────────

var (
	StringPtr = entity.StringPtr
	IntPtr    = entity.IntPtr
)
