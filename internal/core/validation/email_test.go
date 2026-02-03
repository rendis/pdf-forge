package validation

import "testing"

func TestIsValidEmail(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  bool
	}{
		// Valid emails
		{"simple", "user@example.com", true},
		{"with subdomain", "user@mail.example.com", true},
		{"with plus tag", "user+tag@example.com", true},
		{"with dots in local", "first.last@example.com", true},
		{"short domain", "a@b.co", true},
		{"with numbers", "user123@example123.com", true},
		{"uppercase", "USER@EXAMPLE.COM", true},
		{"mixed case", "User@Example.Com", true},

		// Invalid emails
		{"empty string", "", false},
		{"no at sign", "userexample.com", false},
		{"no domain", "user@", false},
		{"no local part", "@example.com", false},
		{"double at", "user@@example.com", false},
		{"spaces", "user @example.com", false},
		{"just text", "invalid", false},
		// Note: "user@example" (no TLD) is valid per RFC 5322, net/mail accepts it
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsValidEmail(tt.email)
			if got != tt.want {
				t.Errorf("IsValidEmail(%q) = %v, want %v", tt.email, got, tt.want)
			}
		})
	}
}

func TestNormalizeName(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"simple name", "John Doe", "John Doe"},
		{"leading spaces", "  John Doe", "John Doe"},
		{"trailing spaces", "John Doe  ", "John Doe"},
		{"multiple internal spaces", "John    Doe", "John Doe"},
		{"tabs and spaces", "John\t\tDoe", "John Doe"},
		{"newlines", "John\nDoe", "John Doe"},
		{"mixed whitespace", "  John  \t  Doe  ", "John Doe"},
		{"empty string", "", ""},
		{"only spaces", "   ", ""},
		{"single word", "John", "John"},
		{"three words", "John  Middle   Doe", "John Middle Doe"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NormalizeName(tt.input)
			if got != tt.want {
				t.Errorf("NormalizeName(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
