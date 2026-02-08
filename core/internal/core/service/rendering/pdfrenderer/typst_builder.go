package pdfrenderer

import (
	"fmt"
	"strings"

	"github.com/rendis/pdf-forge/internal/core/entity/portabledoc"
)

// pixelsToPoints converts pixels (at 96 DPI) to typographic points.
const pxToPt = 0.75 // 1px at 96 DPI = 0.75pt

// TypstBuilder constructs complete Typst documents from portable documents.
type TypstBuilder struct {
	converter *TypstConverter
}

// NewTypstBuilder creates a new Typst builder.
func NewTypstBuilder(
	injectables map[string]any,
	injectableDefaults map[string]string,
) *TypstBuilder {
	return &TypstBuilder{
		converter: NewTypstConverter(injectables, injectableDefaults),
	}
}

// Build creates a complete Typst document from a portable document.
func (b *TypstBuilder) Build(doc *portabledoc.Document) string {
	var sb strings.Builder

	// Page configuration
	sb.WriteString(b.pageSetup(&doc.PageConfig))

	// Base typography
	sb.WriteString(b.typographySetup())

	// Heading styles
	sb.WriteString(b.headingStyles())

	// Render content
	if doc.Content != nil {
		sb.WriteString(b.converter.ConvertNodes(doc.Content.Content))
	}

	return sb.String()
}

// pageSetup generates #set page(...) directive from PageConfig.
func (b *TypstBuilder) pageSetup(config *portabledoc.PageConfig) string {
	widthPt := config.Width * pxToPt
	heightPt := config.Height * pxToPt
	marginTopPt := config.Margins.Top * pxToPt
	marginBottomPt := config.Margins.Bottom * pxToPt
	marginLeftPt := config.Margins.Left * pxToPt
	marginRightPt := config.Margins.Right * pxToPt

	var sb strings.Builder

	// Check if this matches a standard paper size
	paper := b.detectPaperSize(config.FormatID)
	if paper != "" {
		sb.WriteString(fmt.Sprintf("#set page(\n  paper: \"%s\",\n", paper))
	} else {
		sb.WriteString(fmt.Sprintf("#set page(\n  width: %.1fpt,\n  height: %.1fpt,\n", widthPt, heightPt))
	}

	sb.WriteString(fmt.Sprintf("  margin: (top: %.1fpt, bottom: %.1fpt, left: %.1fpt, right: %.1fpt),\n",
		marginTopPt, marginBottomPt, marginLeftPt, marginRightPt))

	// Page numbering
	if config.ShowPageNumbers {
		sb.WriteString("  numbering: \"1\",\n")
	}

	sb.WriteString(")\n\n")
	return sb.String()
}

// detectPaperSize maps FormatID to Typst paper names.
func (b *TypstBuilder) detectPaperSize(formatID string) string {
	switch formatID {
	case portabledoc.PageFormatA4:
		return "a4"
	case portabledoc.PageFormatLetter:
		return "us-letter"
	case portabledoc.PageFormatLegal:
		return "us-legal"
	default:
		return "" // Custom — use explicit width/height
	}
}

// typographySetup generates base text and paragraph settings.
func (b *TypstBuilder) typographySetup() string {
	return `#set text(
  font: ("Helvetica Neue", "Arial", "Libertinus Serif"),
  size: 12pt,
  fill: rgb("#333333"),
  hyphenate: true,
)

#set par(leading: 0.75em, spacing: 0.75em)

`
}

// headingStyles generates show rules for heading sizes matching the CSS styles.
func (b *TypstBuilder) headingStyles() string {
	return `#show heading.where(level: 1): set text(size: 24pt, weight: 600)
#show heading.where(level: 2): set text(size: 20pt, weight: 600)
#show heading.where(level: 3): set text(size: 16pt, weight: 600)
#show heading.where(level: 4): set text(size: 14pt, weight: 600)
#show heading.where(level: 5): set text(size: 12pt, weight: 600)
#show heading.where(level: 6): set text(size: 11pt, weight: 600)

`
}

// GetPageCount returns the page count based on page breaks encountered.
func (b *TypstBuilder) GetPageCount() int {
	return b.converter.GetCurrentPage()
}

// RemoteImages returns the map of remote image URLs to local filenames collected during build.
func (b *TypstBuilder) RemoteImages() map[string]string {
	return b.converter.RemoteImages()
}
