package pdfrenderer

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
)

// pixelsToPoints converts pixels (at 96 DPI) to typographic points.
const pxToPt = 0.75 // 1px at 96 DPI = 0.75pt

// Surface rendering constants shared by header and footer (metrics-driven layout).
const (
	surfaceImageMinWidthPx = 32.0
	surfaceTextMinWidthPx  = 240.0
	surfaceImageGapPx      = 16.0
	surfaceImageHeightPx   = 96.0
	surfaceTextHeightPx    = 96.0
	surfaceTextBaseFontPt  = 10.5
	surfacePadPx           = 12.0
	surfaceMinHeightPx     = surfaceTextHeightPx + (surfacePadPx * 2)
)

// surfaceRenderMetrics holds precomputed dimensions for header/footer layout.
type surfaceRenderMetrics struct {
	surfaceMinHeightPt   float64
	surfaceVerticalPadPt float64
	textSlotHeightPt     float64
	imageGapPt           float64
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
	sb.WriteString(b.pageSetup(&doc.PageConfig, doc.HeaderEnabled(), doc.FooterEnabled()))

	// Base typography
	sb.WriteString(b.typographySetup())

	// Heading styles
	sb.WriteString(b.headingStyles())

	// Set content area width for table column calculations
	b.converter.contentWidthPx = doc.PageConfig.Width - doc.PageConfig.Margins.Left - doc.PageConfig.Margins.Right

	// Header/footer as native page header/footer — must be #set rules before content.
	// Header renders only on page 1, footer only on the last page.
	// Margins reserve space on ALL pages for consistent text flow area.
	if doc.HeaderEnabled() {
		sb.WriteString(b.headerBlock(doc))
	}
	if doc.FooterEnabled() {
		sb.WriteString(b.footerBlock(doc))
	}

	// Render content
	if doc.Content != nil {
		sb.WriteString(b.converter.ConvertNodes(doc.Content.Content))
	}

	return sb.String()
}

// pageSetup generates #set page(...) directive from PageConfig.
// When hasHeader is true, top margin is halved.
// When hasFooter is true, bottom margin is halved.
func (b *TypstBuilder) pageSetup(config *portabledoc.PageConfig, hasHeader, hasFooter bool) string {
	widthPt := config.Width * pxToPt
	heightPt := config.Height * pxToPt
	marginTopPt := config.Margins.Top * pxToPt
	if hasHeader {
		marginTopPt = surfaceMinHeightPx * pxToPt // reserve space for native page header
	}
	marginBottomPt := config.Margins.Bottom * pxToPt
	if hasFooter {
		marginBottomPt = surfaceMinHeightPx * pxToPt // reserve space for native page footer
	}
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

	// Disable default header-ascent/footer-descent so the full margin space
	// is available for our header/footer blocks. The blocks handle their own
	// internal padding via inset.
	if hasHeader {
		sb.WriteString("  header-ascent: 0pt,\n")
	}
	if hasFooter {
		sb.WriteString("  footer-descent: 0pt,\n")
	}

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
	fmt.Fprintf(&sb, "#set text(\n  font: %s,\n  size: %s,\n  fill: %s,\n  top-edge: 0.8em,\n  bottom-edge: -0.2em,\n  hyphenate: true,\n  number-width: \"proportional\",\n)\n\n",
		fontList, b.tokens.BaseFontSize, typstColorExpr(b.tokens.BaseTextColor))
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

// renderSurfaceContent resolves text, image, and layout for a surface and returns
// the inner Typst content string. Returns "" if the surface produces no visible output.
func (b *TypstBuilder) renderSurfaceContent(
	s portabledoc.DocumentSurface,
	pageConfig *portabledoc.PageConfig,
	metrics surfaceRenderMetrics,
) string {
	textNodes := s.ContentNodes()
	textTypst := b.renderSurfaceText(textNodes, metrics)
	hasText := strings.TrimSpace(textTypst) != ""
	maxImageWidthPx := resolveSurfaceMaxImageWidthPx(pageConfig, hasText)
	imageTypst := b.renderSurfaceImage(s, maxImageWidthPx)
	imageWidthPt, hasImageWidth := resolveSurfaceImageWidthPt(s, maxImageWidthPx)
	imageSlot := renderSurfaceImageSlot(imageTypst, imageWidthPt, hasImageWidth, metrics)

	var content string
	switch s.SurfaceLayout() {
	case portabledoc.SurfaceLayoutImageCenter:
		content = renderCenteredSurface(imageSlot, textTypst)
	case portabledoc.SurfaceLayoutImageRight:
		content = renderLateralSurface(textTypst, imageSlot, false, imageWidthPt, hasImageWidth, metrics)
	default: // image-left
		content = renderLateralSurface(imageSlot, textTypst, true, imageWidthPt, hasImageWidth, metrics)
	}

	if strings.TrimSpace(content) == "" {
		return ""
	}
	return content
}

// headerBlock generates a #set page(header: ...) directive that renders the header
// only on the first page using Typst's native page header mechanism.
func (b *TypstBuilder) headerBlock(doc *portabledoc.Document) string {
	h := doc.Header
	if h == nil || !h.Enabled {
		return ""
	}

	metrics := resolveSurfaceRenderMetrics(&doc.PageConfig)
	content := b.renderSurfaceContent(h, &doc.PageConfig, metrics)
	if content == "" {
		return ""
	}

	// align(top) is required because Typst bottom-aligns header content by default.
	return fmt.Sprintf(
		"#set page(header: context {\n"+
			"  let current = counter(page).get().first()\n"+
			"  if current == 1 [\n"+
			"    #block(width: 100%%, height: %.1fpt, inset: (top: %.1fpt, bottom: %.1fpt), clip: true)[\n"+
			"      #align(top)[\n"+
			"%s"+
			"      ]\n"+
			"    ]\n"+
			"  ]\n"+
			"})\n\n",
		metrics.surfaceMinHeightPt,
		metrics.surfaceVerticalPadPt,
		metrics.surfaceVerticalPadPt,
		content,
	)
}

// footerBlock generates a #set page(footer: ...) directive that renders the footer
// only on the last page using Typst's native page footer mechanism.
func (b *TypstBuilder) footerBlock(doc *portabledoc.Document) string {
	f := doc.Footer
	if f == nil || !f.Enabled {
		return ""
	}

	metrics := resolveSurfaceRenderMetrics(&doc.PageConfig)
	content := b.renderSurfaceContent(f, &doc.PageConfig, metrics)
	if content == "" {
		return ""
	}

	// align(top) matches the editor surface where footer text starts at the top.
	return fmt.Sprintf(
		"#set page(footer: context {\n"+
			"  let total = counter(page).final().first()\n"+
			"  let current = counter(page).get().first()\n"+
			"  if current == total [\n"+
			"    #block(width: 100%%, height: %.1fpt, inset: (top: %.1fpt, bottom: %.1fpt), clip: true)[\n"+
			"      #align(top)[\n"+
			"%s"+
			"      ]\n"+
			"    ]\n"+
			"  ]\n"+
			"})\n\n",
		metrics.surfaceMinHeightPt,
		metrics.surfaceVerticalPadPt,
		metrics.surfaceVerticalPadPt,
		content,
	)
}

// renderSurfaceImage generates the Typst #image() directive for a surface (header or footer) image.
// Uses height as primary dimension; fit depends on whether image is injectable.
func (b *TypstBuilder) renderSurfaceImage(s portabledoc.DocumentSurface, maxWidthPx float64) string {
	if !s.HasImage() {
		return ""
	}

	attrs := map[string]any{
		"src":          s.SurfaceImageURL(),
		"injectableId": s.SurfaceImageInjectableID(),
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

	heightPx := surfaceImageHeightPx
	if s.SurfaceImageHeight() > 0 {
		heightPx = s.SurfaceImageHeight()
	}

	args := []string{
		fmt.Sprintf("%q", imageFilename),
		fmt.Sprintf("height: %.1fpt", heightPx*pxToPt),
	}

	isInjectable := s.SurfaceImageInjectableID() != ""
	if widthPt, ok := resolveSurfaceImageWidthPt(s, maxWidthPx); ok {
		args = append(args, fmt.Sprintf("width: %.1fpt", widthPt))
		if isInjectable {
			args = append(args, `fit: "contain"`)
		} else {
			args = append(args, `fit: "stretch"`)
		}
	}

	return fmt.Sprintf("#image(%s)", strings.Join(args, ", "))
}

// resolveSurfaceImageWidthPt computes the surface image width in points.
func resolveSurfaceImageWidthPt(s portabledoc.DocumentSurface, maxWidthPx float64) (float64, bool) {
	if s == nil || s.SurfaceImageWidth() <= 0 {
		return 0, false
	}

	widthPx := min(s.SurfaceImageWidth(), maxWidthPx)
	widthPx = max(surfaceImageMinWidthPx, widthPx)

	return widthPx * pxToPt, true
}

// renderSurfaceText converts header/footer ProseMirror nodes to Typst with constrained dimensions.
// Renders node content inline (without per-paragraph wrappers) since the outer block
// already controls text size, leading, and spacing.
func (b *TypstBuilder) renderSurfaceText(nodes []portabledoc.Node, metrics surfaceRenderMetrics) string {
	if len(nodes) == 0 {
		return ""
	}

	normalized := normalizeSurfaceTextNodes(nodes)
	converted := b.convertSurfaceNodes(normalized)
	if strings.TrimSpace(converted) == "" {
		return ""
	}

	return fmt.Sprintf(
		"#[\n#set text(size: %.1fpt)\n#set par(linebreaks: \"simple\", spacing: 0pt)\n%s\n]\n",
		surfaceTextBaseFontPt,
		strings.TrimRight(converted, "\n"),
	)
}

// convertSurfaceNodes renders header/footer content nodes extracting inline text
// from paragraphs, wrapping each text run in #text(size) for the surface font size.
func (b *TypstBuilder) convertSurfaceNodes(nodes []portabledoc.Node) string {
	var sb strings.Builder
	for _, node := range nodes {
		if node.Type == portabledoc.NodeTypeParagraph {
			content := b.converter.ConvertNodes(node.Content)
			if content != "" {
				align, _ := node.Attrs["textAlign"].(string)
				if align == "justify" {
					sb.WriteString(fmt.Sprintf("#par(justify: true)[%s]", content))
				} else if typstAlign := toTypstAlign(align); typstAlign != "" {
					sb.WriteString(fmt.Sprintf("#align(%s)[%s]", typstAlign, content))
				} else {
					sb.WriteString(content)
				}
				sb.WriteString("\n")
			}
		} else {
			sb.WriteString(b.converter.ConvertNode(node))
		}
	}
	return sb.String()
}

// renderCenteredSurface renders center layout: image has priority, text only if no image.
func renderCenteredSurface(imageSlot, textTypst string) string {
	if imageSlot != "" {
		return fmt.Sprintf("#align(center)[%s]\n", imageSlot)
	}
	if textTypst != "" {
		return textTypst
	}
	return ""
}

// renderLateralSurface renders side-by-side layout using a grid.
func renderLateralSurface(
	leftContent, rightContent string,
	imageOnLeft bool,
	imageWidthPt float64,
	hasImageWidth bool,
	metrics surfaceRenderMetrics,
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

// renderSurfaceImageSlot wraps the image in a block with centered alignment.
func renderSurfaceImageSlot(imageTypst string, imageWidthPt float64, hasImageWidth bool, metrics surfaceRenderMetrics) string {
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

// --- Surface helper functions (shared by header and footer) ---

func resolveSurfaceRenderMetrics(pageConfig *portabledoc.PageConfig) surfaceRenderMetrics {
	return surfaceRenderMetrics{
		surfaceMinHeightPt:   surfaceMinHeightPx * pxToPt,
		surfaceVerticalPadPt: surfacePadPx * pxToPt,
		textSlotHeightPt:     surfaceTextHeightPx * pxToPt,
		imageGapPt:           surfaceImageGapPx * pxToPt,
	}
}

func resolveSurfaceMaxImageWidthPx(pageConfig *portabledoc.PageConfig, hasText bool) float64 {
	if pageConfig == nil {
		if hasText {
			return surfaceTextMinWidthPx
		}
		return 0
	}

	usableWidth := pageConfig.Width - pageConfig.Margins.Left - pageConfig.Margins.Right
	if !hasText {
		return max(surfaceImageMinWidthPx, usableWidth)
	}

	return max(surfaceImageMinWidthPx, usableWidth-surfaceImageGapPx-surfaceTextMinWidthPx)
}

func normalizeSurfaceTextNodes(nodes []portabledoc.Node) []portabledoc.Node {
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
