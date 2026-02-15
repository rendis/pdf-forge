package dto

import (
	"regexp"
	"strings"
)

// codeRegex validates codes:
// - Only uppercase letters, numbers, and underscores
// - Segments separated by single underscores
// Valid: CODE, CODE_V2, MY_CODE_123
// Invalid: _CODE, CODE_, __CODE, CODE__V2
var codeRegex = regexp.MustCompile(`^[A-Z0-9]+(_[A-Z0-9]+)*$`)

// normalizeCode transforms input into a valid code format:
// - Converts to uppercase
// - Replaces spaces with underscores
// - Removes invalid characters (keeps only A-Z, 0-9, _)
// - Removes consecutive underscores
// - Removes leading and trailing underscores
func normalizeCode(code string) string {
	code = strings.ToUpper(code)
	code = strings.ReplaceAll(code, " ", "_")
	var result strings.Builder
	for _, r := range code {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			result.WriteRune(r)
		}
	}
	code = result.String()
	for strings.Contains(code, "__") {
		code = strings.ReplaceAll(code, "__", "_")
	}
	code = strings.Trim(code, "_")
	return code
}

// validateCode checks if a code meets all requirements.
func validateCode(code string) error {
	if code == "" {
		return ErrCodeRequired
	}
	if len(code) > 50 {
		return ErrCodeTooLong
	}
	if strings.Contains(code, "__") {
		return ErrCodeConsecutiveUnder
	}
	if strings.HasPrefix(code, "_") || strings.HasSuffix(code, "_") {
		return ErrCodeStartEndUnder
	}
	if !codeRegex.MatchString(code) {
		return ErrCodeInvalidFormat
	}
	return nil
}
