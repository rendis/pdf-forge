package portabledoc

import (
	"fmt"
	"regexp"
	"strings"
)

// anchorSanitizer removes non-alphanumeric characters for anchor string generation.
var anchorSanitizer = regexp.MustCompile(`[^a-z0-9_]`)

// GenerateAnchorString creates a valid anchor string from a role label.
// Format: __sig_{sanitized_label}__
// This function is used both during template publishing (to store anchors)
// and during document generation (to match recipients to roles).
func GenerateAnchorString(label string) string {
	// Convert to lowercase
	sanitized := strings.ToLower(label)
	// Replace spaces with underscores
	sanitized = strings.ReplaceAll(sanitized, " ", "_")
	// Remove invalid characters
	sanitized = anchorSanitizer.ReplaceAllString(sanitized, "")
	// Ensure it starts with a letter
	if len(sanitized) > 0 && (sanitized[0] < 'a' || sanitized[0] > 'z') {
		sanitized = "role_" + sanitized
	}
	// Handle empty result
	if sanitized == "" {
		sanitized = "role"
	}
	return fmt.Sprintf("__sig_%s__", sanitized)
}
