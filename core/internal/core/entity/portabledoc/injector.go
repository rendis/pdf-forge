package portabledoc

// InjectorAttrs represents injector node attributes.
type InjectorAttrs struct {
	Type             string   `json:"type"`
	Label            string   `json:"label"`
	VariableID       string   `json:"variableId"`
	Format           *string  `json:"format,omitempty"`
	Required         *bool    `json:"required,omitempty"`
	Prefix           *string  `json:"prefix,omitempty"`
	Suffix           *string  `json:"suffix,omitempty"`
	ShowLabelIfEmpty *bool    `json:"showLabelIfEmpty,omitempty"`
	DefaultValue     *string  `json:"defaultValue,omitempty"`
	Width            *float64 `json:"width,omitempty"`
}

// Injector type constants.
const (
	InjectorTypeText     = "TEXT"
	InjectorTypeNumber   = "NUMBER"
	InjectorTypeDate     = "DATE"
	InjectorTypeCurrency = "CURRENCY"
	InjectorTypeBoolean  = "BOOLEAN"
	InjectorTypeImage    = "IMAGE"
	InjectorTypeTable    = "TABLE"
)

// ValidInjectorTypes contains allowed injector types.
var ValidInjectorTypes = Set[string]{
	InjectorTypeText:     {},
	InjectorTypeNumber:   {},
	InjectorTypeDate:     {},
	InjectorTypeCurrency: {},
	InjectorTypeBoolean:  {},
	InjectorTypeImage:    {},
	InjectorTypeTable:    {},
}
