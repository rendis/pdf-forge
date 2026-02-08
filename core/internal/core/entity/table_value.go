package entity

// TableStyles defines styling options for table headers and body content.
type TableStyles struct {
	FontFamily *string `json:"fontFamily,omitempty"` // e.g., "Arial", "Times New Roman"
	FontSize   *int    `json:"fontSize,omitempty"`   // in pixels
	FontWeight *string `json:"fontWeight,omitempty"` // "normal", "bold"
	TextColor  *string `json:"textColor,omitempty"`  // e.g., "#333333"
	TextAlign  *string `json:"textAlign,omitempty"`  // "left", "center", "right"
	Background *string `json:"background,omitempty"` // e.g., "#f5f5f5" (primarily for headers)
}

// TableColumn defines a column in a dynamic table.
type TableColumn struct {
	Key      string            `json:"key"`              // unique column identifier
	Labels   map[string]string `json:"labels"`           // i18n labels: {"es":"Nombre","en":"Name"}
	DataType ValueType         `json:"dataType"`         // expected cell value type
	Width    *string           `json:"width,omitempty"`  // e.g., "100px", "20%"
	Format   *string           `json:"format,omitempty"` // format string for the column
}

// TableCell represents a single cell in a table row.
type TableCell struct {
	Value   *InjectableValue `json:"value,omitempty"`   // cell content
	Colspan int              `json:"colspan,omitempty"` // number of columns to span
	Rowspan int              `json:"rowspan,omitempty"` // number of rows to span
}

// TableRow represents a row of cells in a table.
type TableRow struct {
	Cells []TableCell `json:"cells"`
}

// TableValue represents a complete table with columns, rows, and styling.
type TableValue struct {
	Columns      []TableColumn `json:"columns"`
	Rows         []TableRow    `json:"rows"`
	HeaderStyles *TableStyles  `json:"headerStyles,omitempty"`
	BodyStyles   *TableStyles  `json:"bodyStyles,omitempty"`
}

// NewTableValue creates a new empty TableValue.
func NewTableValue() *TableValue {
	return &TableValue{
		Columns: make([]TableColumn, 0),
		Rows:    make([]TableRow, 0),
	}
}

// AddColumn adds a column to the table with the given key, i18n labels, and data type.
func (t *TableValue) AddColumn(key string, labels map[string]string, dataType ValueType) *TableValue {
	t.Columns = append(t.Columns, TableColumn{
		Key:      key,
		Labels:   labels,
		DataType: dataType,
	})
	return t
}

// AddColumnWithWidth adds a column with a specified width.
func (t *TableValue) AddColumnWithWidth(key string, labels map[string]string, dataType ValueType, width string) *TableValue {
	t.Columns = append(t.Columns, TableColumn{
		Key:      key,
		Labels:   labels,
		DataType: dataType,
		Width:    &width,
	})
	return t
}

// AddColumnWithFormat adds a column with a specified format.
func (t *TableValue) AddColumnWithFormat(key string, labels map[string]string, dataType ValueType, format string) *TableValue {
	t.Columns = append(t.Columns, TableColumn{
		Key:      key,
		Labels:   labels,
		DataType: dataType,
		Format:   &format,
	})
	return t
}

// AddRow adds a row of cells to the table.
func (t *TableValue) AddRow(cells ...TableCell) *TableValue {
	t.Rows = append(t.Rows, TableRow{Cells: cells})
	return t
}

// WithHeaderStyles sets the header styles for the table.
func (t *TableValue) WithHeaderStyles(styles TableStyles) *TableValue {
	t.HeaderStyles = &styles
	return t
}

// WithBodyStyles sets the body styles for the table.
func (t *TableValue) WithBodyStyles(styles TableStyles) *TableValue {
	t.BodyStyles = &styles
	return t
}

// Cell creates a simple TableCell with a value.
func Cell(value InjectableValue) TableCell {
	return TableCell{Value: &value}
}

// CellWithSpan creates a TableCell with colspan and/or rowspan.
func CellWithSpan(value InjectableValue, colspan, rowspan int) TableCell {
	return TableCell{
		Value:   &value,
		Colspan: colspan,
		Rowspan: rowspan,
	}
}

// EmptyCell creates an empty TableCell (used for merged cell placeholders).
func EmptyCell() TableCell {
	return TableCell{}
}

// Helper functions to create pointers for optional fields

// StringPtr returns a pointer to the given string.
func StringPtr(s string) *string {
	return &s
}

// IntPtr returns a pointer to the given int.
func IntPtr(i int) *int {
	return &i
}
