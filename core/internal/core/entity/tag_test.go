package entity

import (
	"strings"
	"testing"
)

func TestNormalizeTagName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "trims whitespace",
			input:    "  hello world  ",
			expected: "hello_world",
		},
		{
			name:     "converts to lowercase",
			input:    "Hello World",
			expected: "hello_world",
		},
		{
			name:     "removes diacritics",
			input:    "Café Niño",
			expected: "cafe_nino",
		},
		{
			name:     "handles multiple diacritics",
			input:    "résumé naïve",
			expected: "resume_naive",
		},
		{
			name:     "replaces spaces with underscore",
			input:    "hello   world",
			expected: "hello_world",
		},
		{
			name:     "removes special characters",
			input:    "tag@#$%name!",
			expected: "tagname",
		},
		{
			name:     "keeps hyphens",
			input:    "tag-name-test",
			expected: "tag-name-test",
		},
		{
			name:     "keeps numbers",
			input:    "tag123name456",
			expected: "tag123name456",
		},
		{
			name:     "collapses multiple underscores",
			input:    "tag___name",
			expected: "tag_name",
		},
		{
			name:     "removes leading underscores",
			input:    "___test",
			expected: "test",
		},
		{
			name:     "removes trailing underscores",
			input:    "test___",
			expected: "test",
		},
		{
			name:     "removes leading and trailing underscores",
			input:    "___test___",
			expected: "test",
		},
		{
			name:     "returns empty for only special chars",
			input:    "@#$%",
			expected: "",
		},
		{
			name:     "truncates to 50 characters",
			input:    strings.Repeat("a", 100),
			expected: strings.Repeat("a", 50),
		},
		{
			name:     "handles empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "handles only whitespace",
			input:    "   ",
			expected: "",
		},
		{
			name:     "complex example",
			input:    "  Café & Niño's Test_Tag--2024!  ",
			expected: "cafe_ninos_test_tag--2024",
		},
		{
			name:     "preserves consecutive hyphens",
			input:    "tag--name__test",
			expected: "tag--name_test",
		},
		{
			name:     "handles tabs and newlines",
			input:    "hello\tworld\ntest",
			expected: "hello_world_test",
		},
		{
			name:     "short valid tag",
			input:    "abc",
			expected: "abc",
		},
		{
			name:     "very short tag after normalization",
			input:    "ab",
			expected: "ab",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeTagName(tt.input)
			if result != tt.expected {
				t.Errorf("NormalizeTagName(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestRemoveDiacritics(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "removes accents from vowels",
			input:    "áéíóú",
			expected: "aeiou",
		},
		{
			name:     "removes tilde from n",
			input:    "niño",
			expected: "nino",
		},
		{
			name:     "removes umlaut",
			input:    "über",
			expected: "uber",
		},
		{
			name:     "removes cedilla",
			input:    "façade",
			expected: "facade",
		},
		{
			name:     "handles uppercase diacritics",
			input:    "ÁÉÍÓÚ",
			expected: "AEIOU",
		},
		{
			name:     "preserves non-diacritic characters",
			input:    "hello123",
			expected: "hello123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := removeDiacritics(tt.input)
			if result != tt.expected {
				t.Errorf("removeDiacritics(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestTagValidate_MinLength(t *testing.T) {
	tests := []struct {
		name    string
		tag     Tag
		wantErr bool
	}{
		{
			name: "valid tag with 3 chars",
			tag: Tag{
				WorkspaceID: "ws-123",
				Name:        "abc",
				Color:       "#FF0000",
			},
			wantErr: false,
		},
		{
			name: "invalid tag with 2 chars",
			tag: Tag{
				WorkspaceID: "ws-123",
				Name:        "ab",
				Color:       "#FF0000",
			},
			wantErr: true,
		},
		{
			name: "invalid tag with 1 char",
			tag: Tag{
				WorkspaceID: "ws-123",
				Name:        "a",
				Color:       "#FF0000",
			},
			wantErr: true,
		},
		{
			name: "invalid tag with empty name",
			tag: Tag{
				WorkspaceID: "ws-123",
				Name:        "",
				Color:       "#FF0000",
			},
			wantErr: true,
		},
		{
			name: "valid tag with long name",
			tag: Tag{
				WorkspaceID: "ws-123",
				Name:        "this_is_a_valid_tag_name",
				Color:       "#FF0000",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.tag.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Tag.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
