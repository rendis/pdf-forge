package pdfrenderer

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

var typstNamedColors = map[string]struct{}{
	"aqua":    {},
	"black":   {},
	"blue":    {},
	"fuchsia": {},
	"gray":    {},
	"green":   {},
	"grey":    {},
	"lime":    {},
	"maroon":  {},
	"navy":    {},
	"olive":   {},
	"orange":  {},
	"purple":  {},
	"red":     {},
	"silver":  {},
	"teal":    {},
	"white":   {},
	"yellow":  {},
}

func typstColorExpr(raw string) string {
	color := strings.TrimSpace(raw)
	if color == "" {
		return `rgb("#000000")`
	}

	if isHexColor(color) {
		return fmt.Sprintf(`rgb("%s")`, color)
	}

	if expr, ok := parseCSSRGBColor(color); ok {
		return expr
	}

	if isKnownTypstColorExpr(color) {
		return color
	}

	return `rgb("#000000")`
}

func isHexColor(raw string) bool {
	if !strings.HasPrefix(raw, "#") {
		return false
	}

	hex := raw[1:]
	switch len(hex) {
	case 3, 4, 6, 8:
	default:
		return false
	}

	for _, r := range hex {
		if !strings.ContainsRune("0123456789abcdefABCDEF", r) {
			return false
		}
	}

	return true
}

func parseCSSRGBColor(raw string) (string, bool) {
	lower := strings.ToLower(strings.TrimSpace(raw))
	switch {
	case strings.HasPrefix(lower, "rgb(") && strings.HasSuffix(lower, ")"):
		return parseCSSColorArgs(raw[4:len(raw)-1], false)
	case strings.HasPrefix(lower, "rgba(") && strings.HasSuffix(lower, ")"):
		return parseCSSColorArgs(raw[5:len(raw)-1], true)
	default:
		return "", false
	}
}

func parseCSSColorArgs(inner string, expectAlpha bool) (string, bool) {
	parts := splitCSSColorParts(inner)
	if len(parts) != 3 && len(parts) != 4 {
		return "", false
	}
	if expectAlpha && len(parts) != 4 {
		return "", false
	}

	channels := make([]int, 0, 3)
	for _, part := range parts[:3] {
		channel, ok := parseCSSColorChannel(part)
		if !ok {
			return "", false
		}
		channels = append(channels, channel)
	}

	if len(parts) == 3 {
		return fmt.Sprintf("rgb(%d, %d, %d)", channels[0], channels[1], channels[2]), true
	}

	alpha, ok := parseCSSAlpha(parts[3])
	if !ok {
		return "", false
	}

	return fmt.Sprintf("rgb(%d, %d, %d, %s)", channels[0], channels[1], channels[2], alpha), true
}

func splitCSSColorParts(inner string) []string {
	trimmed := strings.TrimSpace(inner)
	if trimmed == "" {
		return nil
	}

	if strings.Contains(trimmed, ",") {
		rawParts := strings.Split(trimmed, ",")
		parts := make([]string, 0, len(rawParts))
		for _, part := range rawParts {
			part = strings.TrimSpace(part)
			if part != "" {
				parts = append(parts, part)
			}
		}
		return parts
	}

	fields := strings.Fields(strings.NewReplacer("/", " / ", "\t", " ", "\n", " ").Replace(trimmed))
	if len(fields) == 0 {
		return nil
	}

	parts := make([]string, 0, 4)
	alphaIdx := -1
	for idx, field := range fields {
		if field == "/" {
			alphaIdx = idx
			break
		}
	}

	if alphaIdx >= 0 {
		parts = append(parts, fields[:alphaIdx]...)
		if alphaIdx+1 < len(fields) {
			parts = append(parts, fields[alphaIdx+1])
		}
		return parts
	}

	return fields
}

func parseCSSColorChannel(raw string) (int, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0, false
	}

	if strings.HasSuffix(value, "%") {
		num, err := strconv.ParseFloat(strings.TrimSuffix(value, "%"), 64)
		if err != nil || num < 0 || num > 100 {
			return 0, false
		}
		return int(math.Round(num * 255 / 100)), true
	}

	num, err := strconv.ParseFloat(value, 64)
	if err != nil || num < 0 || num > 255 {
		return 0, false
	}

	return int(math.Round(num)), true
}

func parseCSSAlpha(raw string) (string, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false
	}

	if strings.HasSuffix(value, "%") {
		num, err := strconv.ParseFloat(strings.TrimSuffix(value, "%"), 64)
		if err != nil || num < 0 || num > 100 {
			return "", false
		}
		return trimFloat(num) + "%", true
	}

	num, err := strconv.ParseFloat(value, 64)
	if err != nil || num < 0 || num > 1 {
		return "", false
	}

	return trimFloat(num*100) + "%", true
}

func trimFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func isKnownTypstColorExpr(raw string) bool {
	normalized := strings.ToLower(strings.TrimSpace(raw))

	if _, ok := typstNamedColors[normalized]; ok {
		return true
	}

	for _, prefix := range []string{"rgb(", "luma(", "cmyk(", "oklab(", "oklch(", "color."} {
		if strings.HasPrefix(normalized, prefix) && strings.HasSuffix(normalized, ")") {
			return true
		}
	}

	return false
}
