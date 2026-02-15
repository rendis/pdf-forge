package pdfrenderer

import (
	"fmt"
	"strings"
)

// cssFontFallbacks maps common CSS font names (lowercase) to cross-platform fallback chains.
// First entry is the original font (available on macOS/Windows), subsequent entries
// are open-source alternatives available via Alpine packages (ttf-liberation, ttf-dejavu, font-noto).
var cssFontFallbacks = map[string][]string{
	"courier new":     {"Courier New", "Liberation Mono", "DejaVu Sans Mono"},
	"arial":           {"Arial", "Liberation Sans", "DejaVu Sans"},
	"times new roman": {"Times New Roman", "Liberation Serif", "DejaVu Serif"},
	"helvetica":       {"Helvetica", "Liberation Sans", "DejaVu Sans"},
	"helvetica neue":  {"Helvetica Neue", "Helvetica", "Liberation Sans"},
	"georgia":         {"Georgia", "Noto Serif", "Liberation Serif"},
	"inter":           {"Inter", "Noto Sans", "Liberation Sans"},
}

// fontWithFallbacks returns a Typst font parameter with cross-platform fallbacks.
// Known fonts get a fallback list: ("Courier New", "Liberation Mono", "DejaVu Sans Mono")
// Unknown fonts get a single entry: "CustomFont"
func fontWithFallbacks(family string) string {
	fallbacks := cssFontFallbacks[strings.ToLower(strings.TrimSpace(family))]
	if len(fallbacks) == 0 {
		return fmt.Sprintf("\"%s\"", family)
	}

	quoted := make([]string, len(fallbacks))
	for i, f := range fallbacks {
		quoted[i] = fmt.Sprintf("\"%s\"", f)
	}
	return "(" + strings.Join(quoted, ", ") + ")"
}
