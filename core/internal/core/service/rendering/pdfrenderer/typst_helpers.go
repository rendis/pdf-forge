package pdfrenderer

import (
	"strconv"
	"strings"

	"github.com/rendis/pdf-forge/internal/core/entity"
)

// --- Typst escaping ---

// escapeTypst escapes special Typst characters in content text.
func escapeTypst(s string) string {
	replacer := strings.NewReplacer(
		"\\", "\\\\",
		"#", "\\#",
		"*", "\\*",
		"_", "\\_",
		"@", "\\@",
		"$", "\\$",
		"<", "\\<",
		">", "\\>",
		"[", "\\[",
		"]", "\\]",
	)
	return replacer.Replace(s)
}

// unescapeTypst reverses escapeTypst (used for code blocks where we want raw content).
func unescapeTypst(s string) string {
	replacer := strings.NewReplacer(
		"\\\\", "\\",
		"\\#", "#",
		"\\*", "*",
		"\\_", "_",
		"\\@", "@",
		"\\$", "$",
		"\\<", "<",
		"\\>", ">",
		"\\[", "[",
		"\\]", "]",
	)
	return replacer.Replace(s)
}

// escapeTypstString escapes a string for use inside Typst string literals (double-quoted).
func escapeTypstString(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, "\\", "\\\\"), "\"", "\\\"")
}

// --- Image utilities ---

// detectExtFromURL detects the image extension from a URL or data URL.
func detectExtFromURL(url string) string {
	if strings.HasPrefix(url, "data:image/") {
		mimeEnd := strings.Index(url, ";")
		if mimeEnd > 0 {
			mime := url[11:mimeEnd] // after "data:image/"
			switch {
			case strings.Contains(mime, "jpeg"), strings.Contains(mime, "jpg"):
				return ".jpg"
			case strings.Contains(mime, "png"):
				return ".png"
			case strings.Contains(mime, "gif"):
				return ".gif"
			case strings.Contains(mime, "svg"):
				return ".svg"
			case strings.Contains(mime, "webp"):
				return ".webp"
			}
		}
		return ".png"
	}
	for _, candidate := range []string{".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"} {
		if strings.Contains(strings.ToLower(url), candidate) {
			return candidate
		}
	}
	return ".png"
}

// --- List utilities ---

// typstListConfig returns whether the symbol maps to an enum (vs list) and the #set rule.
func typstListConfig(symbol entity.ListSymbol) (isEnum bool, config string) {
	switch symbol {
	case entity.ListSymbolNumber:
		return true, "#set enum(numbering: \"1.\")\n"
	case entity.ListSymbolRoman:
		return true, "#set enum(numbering: \"i.\")\n"
	case entity.ListSymbolLetter:
		return true, "#set enum(numbering: \"a)\")\n"
	case entity.ListSymbolDash:
		return false, "#set list(marker: [–])\n"
	default: // bullet
		return false, ""
	}
}

// --- Alignment ---

// toTypstAlign maps a ProseMirror textAlign value to a Typst align value.
// Returns "" for values that don't need explicit alignment (left, justify).
func toTypstAlign(align string) string {
	switch align {
	case "center":
		return "center"
	case "right":
		return "right"
	default:
		return ""
	}
}

// --- Generic utilities ---

// clamp restricts a value to the range [min, max].
func clamp(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// formatBool returns a localized string for a boolean value.
func formatBool(v bool) string {
	if v {
		return "Sí"
	}
	return "No"
}

// toFloat64 converts a value to float64, returning 0 on failure.
func toFloat64(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case float32:
		return float64(n)
	case int:
		return float64(n)
	case int64:
		return float64(n)
	case string:
		f, _ := strconv.ParseFloat(n, 64)
		return f
	default:
		return 0
	}
}

// getIntAttr extracts an integer attribute from a map, returning defaultVal if not found.
func getIntAttr(attrs map[string]any, key string, defaultVal int) int {
	v, ok := attrs[key]
	if !ok {
		return defaultVal
	}
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	case int64:
		return int(n)
	default:
		return defaultVal
	}
}
