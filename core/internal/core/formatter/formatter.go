package formatter

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"
)

// FormatTime formats a time value according to the pattern.
// Supports patterns like: DD/MM/YYYY, HH:mm, MMMM D, YYYY, etc.
func FormatTime(t time.Time, pattern string) string {
	layout := convertTimePattern(pattern)
	return t.Format(layout)
}

// FormatNumber formats a number according to the pattern and locale.
// Supports patterns like: #,##0.00, $#,##0.00, etc.
func FormatNumber(n float64, pattern string) string {
	// Extract prefix and suffix (currency symbols, %, etc.)
	prefix, numPattern, suffix := extractAffixes(pattern)

	// Count decimal places
	decimals := countDecimals(numPattern)

	// Check if thousands separator is needed
	useThousands := strings.Contains(numPattern, ",")

	// Format the number
	formatted := formatNumberValue(n, decimals, useThousands)

	return prefix + formatted + suffix
}

// FormatBool formats a boolean according to the pattern.
// Pattern format: "TrueValue/FalseValue" (e.g., "Yes/No", "Sí/No")
func FormatBool(b bool, pattern string) string {
	parts := strings.Split(pattern, "/")
	if len(parts) != 2 {
		if b {
			return "true"
		}
		return "false"
	}
	if b {
		return parts[0]
	}
	return parts[1]
}

// FormatPhone formats a phone number according to the pattern.
// Pattern uses # as digit placeholder.
func FormatPhone(phone string, pattern string) string {
	// Extract only digits from the phone
	digits := extractDigits(phone)

	result := strings.Builder{}
	digitIdx := 0

	for _, c := range pattern {
		if c == '#' {
			if digitIdx < len(digits) {
				result.WriteByte(digits[digitIdx])
				digitIdx++
			}
		} else {
			result.WriteRune(c)
		}
	}

	// Append remaining digits if any
	for digitIdx < len(digits) {
		result.WriteByte(digits[digitIdx])
		digitIdx++
	}

	return result.String()
}

// FormatRUT formats a Chilean RUT according to the pattern.
// Pattern uses # as digit placeholder.
func FormatRUT(rut string, pattern string) string {
	// Remove any existing formatting
	clean := strings.ReplaceAll(rut, ".", "")
	clean = strings.ReplaceAll(clean, "-", "")
	clean = strings.ToUpper(clean)

	if pattern == "########-#" {
		// Simple format: 12345678-9
		if len(clean) >= 2 {
			return clean[:len(clean)-1] + "-" + clean[len(clean)-1:]
		}
		return clean
	}

	// Default format: ##.###.###-#
	if len(clean) < 2 {
		return clean
	}

	body := clean[:len(clean)-1]
	verifier := clean[len(clean)-1:]

	// Add dots every 3 digits from right to left
	var parts []string
	for len(body) > 3 {
		parts = append([]string{body[len(body)-3:]}, parts...)
		body = body[:len(body)-3]
	}
	if len(body) > 0 {
		parts = append([]string{body}, parts...)
	}

	return strings.Join(parts, ".") + "-" + verifier
}

// convertTimePattern converts user-friendly time patterns to Go layout format.
func convertTimePattern(pattern string) string {
	// Order matters! Longer patterns must be replaced first
	replacements := []struct{ old, new string }{
		{"YYYY", "2006"},
		{"YY", "06"},
		{"MMMM", "January"},
		{"MMM", "Jan"},
		{"MM", "01"},
		{"DD", "02"},
		{"D", "2"},
		{"HH", "15"},
		{"hh", "03"},
		{"mm", "04"},
		{"ss", "05"},
		{"a", "PM"},
	}

	result := pattern
	for _, r := range replacements {
		result = strings.ReplaceAll(result, r.old, r.new)
	}
	return result
}

// extractAffixes extracts prefix, number pattern, and suffix from a format pattern.
func extractAffixes(pattern string) (prefix, numPattern, suffix string) {
	// Find where the number pattern starts (first #, 0, or ,)
	start := strings.IndexAny(pattern, "#0,")
	if start == -1 {
		return "", pattern, ""
	}

	// Find where the number pattern ends (last #, 0, or .)
	end := len(pattern) - 1
	for end >= start {
		c := pattern[end]
		if c == '#' || c == '0' || c == '.' || c == ',' {
			break
		}
		end--
	}

	prefix = pattern[:start]
	numPattern = pattern[start : end+1]
	suffix = pattern[end+1:]

	return prefix, numPattern, suffix
}

// countDecimals counts the number of decimal places in a pattern.
func countDecimals(pattern string) int {
	dotIdx := strings.LastIndex(pattern, ".")
	if dotIdx == -1 {
		return 0
	}
	// Count # or 0 after the decimal point
	count := 0
	for i := dotIdx + 1; i < len(pattern); i++ {
		if pattern[i] == '#' || pattern[i] == '0' {
			count++
		}
	}
	return count
}

// formatNumberValue formats a float with specified decimals and thousands separator.
func formatNumberValue(n float64, decimals int, useThousands bool) string {
	// Round to specified decimals
	multiplier := math.Pow(10, float64(decimals))
	rounded := math.Round(n*multiplier) / multiplier

	// Format with decimals
	formatStr := fmt.Sprintf("%%.%df", decimals)
	formatted := fmt.Sprintf(formatStr, rounded)

	if !useThousands {
		return formatted
	}

	// Add thousands separator
	parts := strings.Split(formatted, ".")
	intPart := parts[0]

	// Handle negative numbers
	negative := false
	if strings.HasPrefix(intPart, "-") {
		negative = true
		intPart = intPart[1:]
	}

	// Add commas
	var result strings.Builder
	for i, c := range intPart {
		if i > 0 && (len(intPart)-i)%3 == 0 {
			result.WriteByte(',')
		}
		result.WriteRune(c)
	}

	if negative {
		result.Reset()
		result.WriteByte('-')
		for i, c := range intPart {
			if i > 0 && (len(intPart)-i)%3 == 0 {
				result.WriteByte(',')
			}
			result.WriteRune(c)
		}
	}

	if len(parts) > 1 {
		return result.String() + "." + parts[1]
	}
	return result.String()
}

// extractDigits extracts only digits from a string.
func extractDigits(s string) string {
	re := regexp.MustCompile(`\d`)
	matches := re.FindAllString(s, -1)
	return strings.Join(matches, "")
}
