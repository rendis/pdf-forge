package entity

// FormatConfig defines formatting options for an injector.
// Used by the frontend to display available format options
// and by the system to apply formatting to resolved values.
type FormatConfig struct {
	// Default is the default format to apply if none is selected.
	Default string `json:"default"`
	// Options is the list of available format patterns for user selection.
	Options []string `json:"options"`
}
