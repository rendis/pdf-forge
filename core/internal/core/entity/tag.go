package entity

import (
	"regexp"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// hexColorRegex validates hex color format (#RRGGBB).
var hexColorRegex = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// Tag name normalization regexps (pre-compiled for efficiency).
var (
	whitespaceRegex         = regexp.MustCompile(`\s+`)
	nonAllowedCharsRegex    = regexp.MustCompile(`[^a-z0-9_-]`)
	multipleUnderscoreRegex = regexp.MustCompile(`_+`)
)

// NormalizeTagName normalizes a tag name for consistency.
// Transformations applied:
//   - Trims whitespace
//   - Converts to lowercase
//   - Removes diacritics (á→a, ñ→n)
//   - Replaces spaces with underscores
//   - Allows only a-z, 0-9, _, -
//   - Collapses multiple underscores
//   - Removes leading/trailing underscores
//   - Limits to 50 characters
func NormalizeTagName(input string) string {
	// Trim whitespace
	s := strings.TrimSpace(input)

	// Convert to lowercase
	s = strings.ToLower(s)

	// Normalize to NFD and remove diacritics
	s = removeDiacritics(s)

	// Replace whitespace with underscore
	s = whitespaceRegex.ReplaceAllString(s, "_")

	// Keep only allowed characters (a-z, 0-9, _, -)
	s = nonAllowedCharsRegex.ReplaceAllString(s, "")

	// Collapse multiple underscores
	s = multipleUnderscoreRegex.ReplaceAllString(s, "_")

	// Remove leading/trailing underscores
	s = strings.Trim(s, "_")

	// Limit to 50 characters
	if len(s) > 50 {
		s = s[:50]
	}

	return s
}

// removeDiacritics removes diacritical marks from a string.
// For example: "café" → "cafe", "niño" → "nino".
func removeDiacritics(s string) string {
	var result strings.Builder
	for _, r := range norm.NFD.String(s) {
		// Mn: Mark, Nonspacing - these are the diacritical marks
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		result.WriteRune(r)
	}
	return result.String()
}

// Tag represents a cross-cutting label for categorizing templates.
type Tag struct {
	ID          string     `json:"id"`
	WorkspaceID string     `json:"workspaceId"`
	Name        string     `json:"name"`
	Color       string     `json:"color"` // Hex format: #RRGGBB
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty"`
}

// NewTag creates a new tag with a default color if not provided.
func NewTag(workspaceID, name, color string) *Tag {
	if color == "" {
		color = "#3B82F6" // Default blue
	}
	return &Tag{
		WorkspaceID: workspaceID,
		Name:        name,
		Color:       color,
		CreatedAt:   time.Now().UTC(),
	}
}

// Validate checks if the tag data is valid.
func (t *Tag) Validate() error {
	if t.WorkspaceID == "" {
		return ErrRequiredField
	}
	if t.Name == "" {
		return ErrRequiredField
	}
	if len(t.Name) < 3 {
		return ErrFieldTooShort
	}
	if len(t.Name) > 50 {
		return ErrFieldTooLong
	}
	if t.Color != "" && !hexColorRegex.MatchString(t.Color) {
		return ErrInvalidTagColor
	}
	return nil
}

// TagWithCount represents a tag with its template usage count.
// Used for tag listings with statistics.
type TagWithCount struct {
	Tag
	TemplateCount int `json:"templateCount"`
}

// WorkspaceTagsCache represents cached tag data for quick access.
// Mirrors the organizer.workspace_tags_cache table.
type WorkspaceTagsCache struct {
	TagID         string    `json:"tagId"`
	WorkspaceID   string    `json:"workspaceId"`
	TagName       string    `json:"tagName"`
	TagColor      string    `json:"tagColor"`
	TemplateCount int       `json:"templateCount"`
	TagCreatedAt  time.Time `json:"tagCreatedAt"`
}
