package entity

// ListSymbol represents the marker/numbering style for a list.
type ListSymbol string

const (
	ListSymbolBullet ListSymbol = "bullet" // • (default)
	ListSymbolNumber ListSymbol = "number" // 1. 2. 3.
	ListSymbolDash   ListSymbol = "dash"   // –
	ListSymbolRoman  ListSymbol = "roman"  // i. ii. iii.
	ListSymbolLetter ListSymbol = "letter" // a) b) c)
)

// IsValid checks if the list symbol is valid.
func (s ListSymbol) IsValid() bool {
	switch s {
	case ListSymbolBullet, ListSymbolNumber, ListSymbolDash, ListSymbolRoman, ListSymbolLetter:
		return true
	}
	return false
}

// ListStyles defines styling options for list header or items.
type ListStyles struct {
	FontFamily *string `json:"fontFamily,omitempty"`
	FontSize   *int    `json:"fontSize,omitempty"`
	FontWeight *string `json:"fontWeight,omitempty"`
	TextColor  *string `json:"textColor,omitempty"`
	TextAlign  *string `json:"textAlign,omitempty"`
}

// ListItem represents a single item in a list, optionally with nested children.
type ListItem struct {
	Value    *InjectableValue `json:"value,omitempty"`
	Children []ListItem       `json:"children,omitempty"`
}

// ListValue represents a complete injectable list with items and styling.
type ListValue struct {
	Symbol       ListSymbol        `json:"symbol"`
	Items        []ListItem        `json:"items"`
	HeaderLabel  map[string]string `json:"headerLabel,omitempty"` // i18n: {"en":"Title","es":"Título"}
	HeaderStyles *ListStyles       `json:"headerStyles,omitempty"`
	ItemStyles   *ListStyles       `json:"itemStyles,omitempty"`
}

// ListSchema exposes the default configuration of a list injector to the frontend.
type ListSchema struct {
	Symbol      ListSymbol        `json:"symbol"`
	HeaderLabel map[string]string `json:"headerLabel,omitempty"`
}

// NewListValue creates a new empty ListValue with bullet symbol.
func NewListValue() *ListValue {
	return &ListValue{
		Symbol: ListSymbolBullet,
		Items:  make([]ListItem, 0),
	}
}

// WithSymbol sets the list symbol style.
func (l *ListValue) WithSymbol(symbol ListSymbol) *ListValue {
	l.Symbol = symbol
	return l
}

// AddItem adds a simple text item to the list.
func (l *ListValue) AddItem(value InjectableValue) *ListValue {
	l.Items = append(l.Items, ListItem{Value: &value})
	return l
}

// AddNestedItem adds an item with children to the list.
func (l *ListValue) AddNestedItem(value InjectableValue, children ...ListItem) *ListValue {
	l.Items = append(l.Items, ListItem{Value: &value, Children: children})
	return l
}

// WithHeaderLabel sets the i18n header label.
func (l *ListValue) WithHeaderLabel(labels map[string]string) *ListValue {
	l.HeaderLabel = labels
	return l
}

// WithHeaderStyles sets the header styles.
func (l *ListValue) WithHeaderStyles(styles ListStyles) *ListValue {
	l.HeaderStyles = &styles
	return l
}

// WithItemStyles sets the item styles.
func (l *ListValue) WithItemStyles(styles ListStyles) *ListValue {
	l.ItemStyles = &styles
	return l
}

// ListItemValue creates a ListItem with a value (helper for nested items).
func ListItemValue(value InjectableValue) ListItem {
	return ListItem{Value: &value}
}

// ListItemNested creates a ListItem with children.
func ListItemNested(value InjectableValue, children ...ListItem) ListItem {
	return ListItem{Value: &value, Children: children}
}
