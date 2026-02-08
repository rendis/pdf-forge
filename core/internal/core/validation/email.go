package validation

import (
	"net/mail"
	"regexp"
	"strings"
)

var multipleSpaces = regexp.MustCompile(`\s+`)

// IsValidEmail validates an email address using net/mail.ParseAddress.
// This follows RFC 5322 specification for email address format.
func IsValidEmail(email string) bool {
	if email == "" {
		return false
	}
	_, err := mail.ParseAddress(email)
	return err == nil
}

// NormalizeName normalizes a name by trimming whitespace and collapsing
// multiple consecutive spaces into a single space.
func NormalizeName(name string) string {
	name = strings.TrimSpace(name)
	return multipleSpaces.ReplaceAllString(name, " ")
}
