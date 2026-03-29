package pdfrenderer

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
)

// pixelsToPoints converts pixels (at 96 DPI) to typographic points.
const pxToPt = 0.75 // 1px at 96 DPI = 0.75pt

// Header rendering constants (metrics-driven layout).
const (
	headerImageMinWidthPx = 32.0
	headerTextMinWidthPx  = 240.0
	headerImageGapPx      = 16.0
	headerImageHeightPx   = 96.0
	headerTextHeightPx    = 96.0
	headerTextBaseFontPt  = 10.5
	headerSurfacePadPx    = 12.0
	headerSurfaceMinPx    = headerTextHeightPx + (headerSurfacePadPx * 2)
)

// headerRenderMetrics holds precomputed dimensions for header layout.
type headerRenderMetrics struct {
	surfaceMinHeightPt   float64
	surfaceVerticalPadPt float64
	textSlotHeightPt     float64
	imageGapPt           float64
	headerVisualOffsetPt float64
}

// TypstBuilder constructs complete Typst documents from portable documents.
type TypstBuilder struct {
	converter *TypstConverter
	tokens    TypstDesignTokens
}

// NewTypstBuilder creates a new Typst builder.
func NewTypstBuilder(
	injectables map[string]any,
	injectableDefaults map[string]string,
	tokens TypstDesignTokens,
) *TypstBuilder {
	return &TypstBuilder{
		converter: NewTypstConverter(injectables, injectableDefaults, tokens),
		tokens:    tokens,
	}
}

// Build creates a complete Typst document from a portable document.
func (b *TypstBuilder) Build(doc *portabledoc.Document) string {
	var sb strings.Builder

	// Package imports
	sb.WriteString("#import \"@preview/wrap-it:0.1.1\": wrap-content\n\n")

	// Page configuration
	sb.WriteString(b.pageSetup(&doc.PageConfig, false))

	// Base typography
	sb.WriteString(b.typographySetup())

	// Heading styles
	sb.WriteString(b.headingStyles())

	// Set content area width for table column calculations
	b.converter.contentWidthPx = doc.PageConfig.Width - doc.PageConfig.Margins.Left - doc.PageConfig.Margins.Right

	// Render header (first page only, emitted as content block at top)
	if doc.HeaderEnabled() {
		sb.WriteString(b.headerBlock(doc))
	}

	// Render content
	if doc.Content != nil {
		sb.WriteString(b.converter.ConvertNodes(doc.Content.Content))
	}

	return sb.String()
}

// pageSetup generates #set page(...) directive from PageConfig.
// When hasHeader is true, top margin is halved — the header surface
// uses #place(dy: -offset) to fill the reclaimed space.
func (b *TypstBuilder) pageSetup(config *portabledoc.PageConfig, hasHeader bool) string {
	widthPt := config.Width * pxToPt
	heightPt := config.Height * pxToPt
	marginTopPt := config.Margins.Top * pxToPt
	if hasHeader {
		marginTopPt /= 2
	}
	marginBottomPt := config.Margins.Bottom * pxToPt
	marginLeftPt := config.Margins.Left * pxToPt
	marginRightPt := config.Margins.Right * pxToPt

	var sb strings.Builder

	// Check if this matches a standard paper size
	paper := b.detectPaperSize(config.FormatID)
	if paper != "" {
		fmt.Fprintf(&sb, "#set page(\n  paper: %q,\n", paper)
	} else {
		fmt.Fprintf(&sb, "#set page(\n  width: %.1fpt,\n  height: %.1fpt,\n", widthPt, heightPt)
	}

	fmt.Fprintf(&sb, "  margin: (top: %.1fpt, bottom: %.1fpt, left: %.1fpt, right: %.1fpt),\n",
		marginTopPt, marginBottomPt, marginLeftPt, marginRightPt)

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
	quoted := make([]string, len(b.tokens.FontStack))
	for i, f := range b.tokens.FontStack {
		quoted[i] = fmt.Sprintf("%q", f)
	}
	fontList := "(" + strings.Join(quoted, ", ") + ")"

	var sb strings.Builder
	fmt.Fprintf(&sb, "#set text(\n  font: %s,\n  size: %s,\n  fill: rgb(\"%s\"),\n  top-edge: 0.8em,\n  bottom-edge: -0.2em,\n  hyphenate: true,\n  number-width: \"proportional\",\n)\n\n",
		fontList, b.tokens.BaseFontSize, b.tokens.BaseTextColor)
	fmt.Fprintf(&sb, "#set par(leading: %s, spacing: %s)\n\n", b.tokens.ParagraphLeading, b.tokens.ParagraphSpacing)
	return sb.String()
}

// headingStyles generates show rules for heading sizes matching the CSS styles.
func (b *TypstBuilder) headingStyles() string {
	var sb strings.Builder
	for i, size := range b.tokens.HeadingSizes {
		fmt.Fprintf(&sb, "#show heading.where(level: %d): set text(size: %s, weight: %s)\n", i+1, size, b.tokens.HeadingWeight)
	}
	sb.WriteString("\n")
	return sb.String()
}

// SetImageURLResolver sets a function to resolve non-standard image URL schemes.
func (b *TypstBuilder) SetImageURLResolver(fn func(url string) (string, error)) {
	b.converter.imageURLResolver = fn
}

// GetPageCount returns the page count based on page breaks encountered.
func (b *TypstBuilder) GetPageCount() int {
	return b.converter.GetCurrentPage()
}

// RemoteImages returns the map of remote image URLs to local filenames collected during build.
func (b *TypstBuilder) RemoteImages() map[string]string {
	return b.converter.RemoteImages()
}

// headerBlock renders the document header as a Typst content block.
// Supports three layout modes: image-left, image-right, and image-center.
// In center mode, image takes priority over text (text is hidden when image exists).
func (b *TypstBuilder) headerBlock(doc *portabledoc.Document) string {
	h := doc.Header
	if h == nil || !h.Enabled {
		return ""
	}

	metrics := resolveHeaderRenderMetrics(&doc.PageConfig)
	textNodes := h.ContentNodes()
	textTypst := b.renderHeaderText(textNodes, metrics)
	hasText := strings.TrimSpace(textTypst) != ""
	maxImageWidthPx := resolveHeaderMaxImageWidthPx(&doc.PageConfig, hasText)
	imageTypst := b.renderHeaderImage(h, maxImageWidthPx)
	imageWidthPt, hasImageWidth := resolveHeaderImageWidthPt(h, maxImageWidthPx)
	imageSlot := renderHeaderImageSlot(imageTypst, imageWidthPt, hasImageWidth, metrics)

	var content string
	switch h.Layout {
	case portabledoc.HeaderLayoutImageCenter:
		content = renderCenteredHeader(imageSlot, textTypst)
	case portabledoc.HeaderLayoutImageRight:
		content = renderLateralHeader(textTypst, imageSlot, false, imageWidthPt, hasImageWidth, metrics)
	default: // image-left
		content = renderLateralHeader(imageSlot, textTypst, true, imageWidthPt, hasImageWidth, metrics)
	}

	if strings.TrimSpace(content) == "" {
		return ""
	}

	return content + "#v(1.5em)\n"
}

// renderHeaderImage generates the Typst #image() directive for the header image.
// Uses height as primary dimension; fit depends on whether image is injectable.
func (b *TypstBuilder) renderHeaderImage(h *portabledoc.DocumentHeader, maxWidthPx float64) string {
	if !h.HasHeaderImage() {
		return ""
	}

	attrs := map[string]any{
		"src":          h.ImageURL,
		"injectableId": h.ImageInjectableID,
	}
	src := b.converter.resolveImagePath(attrs)
	if src == "" {
		return ""
	}

	imageFilename := src
	if strings.HasPrefix(src, "http://") ||
		strings.HasPrefix(src, "https://") ||
		strings.HasPrefix(src, "data:") {
		imageFilename = b.converter.registerRemoteImage(src)
	}

	heightPx := headerImageHeightPx
	if h.ImageHeight > 0 {
		heightPx = h.ImageHeight
	}

	args := []string{
		fmt.Sprintf("%q", imageFilename),
		fmt.Sprintf("height: %.1fpt", heightPx*pxToPt),
	}

	isInjectable := h.ImageInjectableID != ""
	if widthPt, ok := resolveHeaderImageWidthPt(h, maxWidthPx); ok {
		args = append(args, fmt.Sprintf("width: %.1fpt", widthPt))
		if isInjectable {
			args = append(args, `fit: "contain"`)
		} else {
			args = append(args, `fit: "stretch"`)
		}
	}

	return fmt.Sprintf("#image(%s)", strings.Join(args, ", "))
}

// renderHeaderText converts header ProseMirror nodes to Typst with constrained dimensions.
// Renders node content inline (without per-paragraph wrappers) since the outer block
// already controls text size, leading, and spacing.
func (b *TypstBuilder) renderHeaderText(nodes []portabledoc.Node, metrics headerRenderMetrics) string {
	if len(nodes) == 0 {
		return ""
	}

	normalized := normalizeHeaderTextNodes(nodes)
	converted := b.convertHeaderNodes(normalized)
	if strings.TrimSpace(converted) == "" {
		return ""
	}

	return fmt.Sprintf(
		"#[\n#set text(size: %.1fpt)\n#set par(linebreaks: \"simple\", spacing: 0pt)\n%s\n]\n",
		headerTextBaseFontPt,
		strings.TrimRight(converted, "\n"),
	)
}

// convertHeaderNodes renders header content nodes extracting inline text
// from paragraphs, wrapping each text run in #text(size) for the header font size.
func (b *TypstBuilder) convertHeaderNodes(nodes []portabledoc.Node) string {
	var sb strings.Builder
	for _, node := range nodes {
		if node.Type == portabledoc.NodeTypeParagraph {
			content := b.converter.ConvertNodes(node.Content)
			if content != "" {
				sb.WriteString(content)
				sb.WriteString("\n")
			}
		} else {
			sb.WriteString(b.converter.ConvertNode(node))
		}
	}
	return sb.String()
}

// renderCenteredHeader renders center layout: image has priority, text only if no image.
func renderCenteredHeader(imageSlot, textTypst string) string {
	if imageSlot != "" {
		return fmt.Sprintf("#align(center)[%s]\n", imageSlot)
	}
	if textTypst != "" {
		return textTypst
	}
	return ""
}

// renderLateralHeader renders side-by-side layout using a grid.
func renderLateralHeader(
	leftContent, rightContent string,
	imageOnLeft bool,
	imageWidthPt float64,
	hasImageWidth bool,
	metrics headerRenderMetrics,
) string {
	switch {
	case leftContent != "" && rightContent != "":
		columns := "(auto, 1fr)"
		if imageOnLeft {
			if hasImageWidth {
				columns = fmt.Sprintf("(%.1fpt, 1fr)", imageWidthPt)
			}
		} else {
			if hasImageWidth {
				columns = fmt.Sprintf("(1fr, %.1fpt)", imageWidthPt)
			}
		}

		return fmt.Sprintf(
			"#block(width: 100%%)[\n  #grid(\n    columns: %s,\n    column-gutter: %.1fpt,\n    [%s],\n    [%s],\n  )\n]\n",
			columns,
			metrics.imageGapPt,
			leftContent,
			rightContent,
		)
	case leftContent != "":
		if imageOnLeft {
			return fmt.Sprintf("#align(left)[%s]\n", leftContent)
		}
		return leftContent
	case rightContent != "":
		if imageOnLeft {
			return rightContent
		}
		return fmt.Sprintf("#align(right)[%s]\n", rightContent)
	default:
		return ""
	}
}

// renderHeaderImageSlot wraps the image in a block with centered alignment.
func renderHeaderImageSlot(imageTypst string, imageWidthPt float64, hasImageWidth bool, metrics headerRenderMetrics) string {
	if imageTypst == "" {
		return ""
	}

	if hasImageWidth {
		return fmt.Sprintf(
			"#block(width: %.1fpt, height: %.1fpt)[\n#align(center + horizon)[%s]\n]\n",
			imageWidthPt,
			metrics.textSlotHeightPt,
			imageTypst,
		)
	}

	return fmt.Sprintf(
		"#block(height: %.1fpt)[\n#align(center + horizon)[%s]\n]\n",
		metrics.textSlotHeightPt,
		imageTypst,
	)
}

// renderHeaderSurface wraps header content in a fixed-height surface with padding.
func renderHeaderSurface(content string, metrics headerRenderMetrics) string {
	if strings.TrimSpace(content) == "" {
		return ""
	}

	return fmt.Sprintf(
		"#block(width: 100%%, height: %.1fpt)[\n  #place(top + left, dy: -%.1fpt)[\n    #block(width: 100%%)[\n      #pad(y: %.1fpt)[\n%s\n      ]\n    ]\n  ]\n]\n",
		metrics.surfaceMinHeightPt,
		metrics.headerVisualOffsetPt,
		metrics.surfaceVerticalPadPt,
		indentTypstBlock(strings.TrimRight(content, "\n"), "        "),
	)
}

// --- Header helper functions ---

func resolveHeaderRenderMetrics(pageConfig *portabledoc.PageConfig) headerRenderMetrics {
	headerVisualOffsetPx := 0.0
	if pageConfig != nil {
		headerVisualOffsetPx = pageConfig.Margins.Top / 2
	}

	return headerRenderMetrics{
		surfaceMinHeightPt:   headerSurfaceMinPx * pxToPt,
		surfaceVerticalPadPt: headerSurfacePadPx * pxToPt,
		textSlotHeightPt:     headerTextHeightPx * pxToPt,
		imageGapPt:           headerImageGapPx * pxToPt,
		headerVisualOffsetPt: headerVisualOffsetPx * pxToPt,
	}
}

func resolveHeaderMaxImageWidthPx(pageConfig *portabledoc.PageConfig, hasText bool) float64 {
	if pageConfig == nil {
		if hasText {
			return headerTextMinWidthPx
		}
		return 0
	}

	usableWidth := pageConfig.Width - pageConfig.Margins.Left - pageConfig.Margins.Right
	if !hasText {
		return max(headerImageMinWidthPx, usableWidth)
	}

	return max(headerImageMinWidthPx, usableWidth-headerImageGapPx-headerTextMinWidthPx)
}

func resolveHeaderImageWidthPt(h *portabledoc.DocumentHeader, maxWidthPx float64) (float64, bool) {
	if h == nil || h.ImageWidth <= 0 {
		return 0, false
	}

	widthPx := min(h.ImageWidth, maxWidthPx)
	widthPx = max(headerImageMinWidthPx, widthPx)

	return widthPx * pxToPt, true
}

func normalizeHeaderTextNodes(nodes []portabledoc.Node) []portabledoc.Node {
	if len(nodes) <= 1 {
		return nodes
	}

	normalized := make([]portabledoc.Node, 0, len(nodes))

	for _, node := range nodes {
		if len(normalized) == 0 {
			normalized = append(normalized, cloneNode(node))
			continue
		}

		prev := &normalized[len(normalized)-1]
		if prev.Type == portabledoc.NodeTypeParagraph &&
			node.Type == portabledoc.NodeTypeParagraph &&
			reflect.DeepEqual(prev.Attrs, node.Attrs) {
			if len(prev.Content) > 0 {
				prev.Content = append(prev.Content, portabledoc.Node{Type: portabledoc.NodeTypeHardBreak})
			}
			prev.Content = append(prev.Content, cloneNodes(node.Content)...)
			continue
		}

		normalized = append(normalized, cloneNode(node))
	}

	return normalized
}

func cloneNodes(nodes []portabledoc.Node) []portabledoc.Node {
	if len(nodes) == 0 {
		return nil
	}
	cloned := make([]portabledoc.Node, len(nodes))
	for i, n := range nodes {
		cloned[i] = cloneNode(n)
	}
	return cloned
}

func cloneNode(node portabledoc.Node) portabledoc.Node {
	cloned := node
	if node.Content != nil {
		cloned.Content = cloneNodes(node.Content)
	}
	if node.Attrs != nil {
		cloned.Attrs = make(map[string]any, len(node.Attrs))
		for k, v := range node.Attrs {
			cloned.Attrs[k] = v
		}
	}
	if node.Text != nil {
		text := *node.Text
		cloned.Text = &text
	}
	if node.Marks != nil {
		cloned.Marks = append([]portabledoc.Mark(nil), node.Marks...)
	}
	return cloned
}

func indentTypstBlock(content, prefix string) string {
	if content == "" {
		return ""
	}
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		if line == "" {
			lines[i] = prefix
			continue
		}
		lines[i] = prefix + line
	}
	return strings.Join(lines, "\n")
}
