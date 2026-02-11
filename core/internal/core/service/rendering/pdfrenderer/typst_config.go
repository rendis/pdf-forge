package pdfrenderer

// TypstDesignTokens holds all configurable design values for Typst output.
// Fork users can customize these via engine.WithDesignTokens().
type TypstDesignTokens struct {
	// Base typography
	FontStack        []string // Default font family chain
	BaseFontSize     string   // Base font size (e.g., "12pt")
	BaseTextColor    string   // Default text color hex (e.g., "#333333")
	ParagraphLeading string   // Line spacing within paragraphs (e.g., "0.75em")
	ParagraphSpacing string   // Spacing between paragraphs (e.g., "1.5em")

	// Heading styles (level 1-6)
	HeadingSizes  [6]string // Font sizes per heading level
	HeadingWeight string    // Font weight for all headings

	// Block elements
	BlockquoteFill        string // Blockquote background color
	BlockquoteStrokeColor string // Blockquote left border color
	HRStrokeColor         string // Horizontal rule color
	HighlightDefaultColor string // Default highlight/marker color

	// Table defaults
	TableStrokeColor       string // Table border color
	TableHeaderFillDefault string // Default table header background
	TableCellInset         string // Cell padding (e.g., "6pt")

	// Placeholder styling (missing injectable)
	PlaceholderFillBg    string // Placeholder block background
	PlaceholderStroke    string // Placeholder block border color
	PlaceholderTextColor string // Placeholder text color
}

// DefaultDesignTokens returns the built-in design tokens matching the current rendering output.
func DefaultDesignTokens() TypstDesignTokens {
	return TypstDesignTokens{
		FontStack:        []string{"Helvetica Neue", "Arial", "Libertinus Serif"},
		BaseFontSize:     "12pt",
		BaseTextColor:    "#333333",
		ParagraphLeading: "0.75em",
		ParagraphSpacing: "1.5em",

		HeadingSizes:  [6]string{"24pt", "20pt", "16pt", "14pt", "12pt", "11pt"},
		HeadingWeight: "600",

		BlockquoteFill:        "#f9f9f9",
		BlockquoteStrokeColor: "luma(200)",
		HRStrokeColor:         "luma(200)",
		HighlightDefaultColor: "#ffeb3b",

		TableStrokeColor:       "luma(200)",
		TableHeaderFillDefault: "#f5f5f5",
		TableCellInset:         "(x: 8pt, y: 12pt)",

		PlaceholderFillBg:    "#fff3cd",
		PlaceholderStroke:    "#ffc107",
		PlaceholderTextColor: "#856404",
	}
}
