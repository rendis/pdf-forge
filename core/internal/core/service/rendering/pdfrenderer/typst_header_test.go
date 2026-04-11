package pdfrenderer

import (
	"strings"
	"testing"

	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
)

func newTestBuilder() *TypstBuilder {
	return NewTypstBuilder(nil, nil, DefaultDesignTokens())
}

func newTestBuilderWithInjectables(inj map[string]any) *TypstBuilder {
	return NewTypstBuilder(inj, nil, DefaultDesignTokens())
}

func testDoc(header *portabledoc.DocumentHeader) *portabledoc.Document {
	return &portabledoc.Document{
		Version: portabledoc.CurrentVersion,
		PageConfig: portabledoc.PageConfig{
			FormatID: portabledoc.PageFormatA4,
			Width:    595, Height: 842,
			Margins: portabledoc.Margins{Top: 72, Bottom: 72, Left: 72, Right: 72},
		},
		Header:  header,
		Content: &portabledoc.ProseMirrorDoc{Type: "doc"},
	}
}

func headerText(text string) *portabledoc.ProseMirrorDoc {
	return &portabledoc.ProseMirrorDoc{
		Type: "doc",
		Content: []portabledoc.Node{
			paragraphNode(textNode(text)),
		},
	}
}

func TestHeaderBlock_NilHeader(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(nil)
	got := b.headerBlock(doc)
	if got != "" {
		t.Errorf("expected empty for nil header, got %q", got)
	}
}

func TestHeaderBlock_DisabledHeader(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: false,
		Content: headerText("should not render"),
	})
	got := b.headerBlock(doc)
	if got != "" {
		t.Errorf("expected empty for disabled header, got %q", got)
	}
}

func TestHeaderBlock_EmptyContent(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{Enabled: true})
	got := b.headerBlock(doc)
	if got != "" {
		t.Errorf("expected empty for empty header, got %q", got)
	}
}

func TestHeaderBlock_TextOnly(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: true,
		Content: headerText("Company Name"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "Company Name") {
		t.Errorf("expected header text, got %q", got)
	}
	if !strings.Contains(got, "#set text(size:") {
		t.Errorf("expected text size override, got %q", got)
	}
}

func TestHeaderBlock_ImageLeft(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled:    true,
		Layout:     portabledoc.SurfaceLayoutImageLeft,
		ImageURL:   "data:image/png;base64,abc",
		ImageWidth: 100,
		Content:    headerText("Text"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "#grid(") {
		t.Errorf("expected grid layout, got %q", got)
	}
	if !strings.Contains(got, "75.0pt, 1fr") { // 100 * 0.75 = 75.0pt (image-left)
		t.Errorf("expected image-left grid columns, got %q", got)
	}
}

func TestHeaderBlock_ImageRight(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled:    true,
		Layout:     portabledoc.SurfaceLayoutImageRight,
		ImageURL:   "data:image/png;base64,abc",
		ImageWidth: 100,
		Content:    headerText("Text"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "#grid(") {
		t.Errorf("expected grid layout, got %q", got)
	}
	if !strings.Contains(got, "1fr, 75.0pt") { // image-right
		t.Errorf("expected image-right grid columns, got %q", got)
	}
}

func TestHeaderBlock_ImageCenter_HidesText(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled:    true,
		Layout:     portabledoc.SurfaceLayoutImageCenter,
		ImageURL:   "data:image/png;base64,abc",
		ImageWidth: 100,
		Content:    headerText("Should be hidden"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "#align(center)") {
		t.Errorf("expected center alignment, got %q", got)
	}
	// Center layout with image should NOT include text
	if strings.Contains(got, "Should be hidden") {
		t.Errorf("center layout with image should hide text, got %q", got)
	}
}

func TestHeaderBlock_ImageCenter_TextFallback(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: true,
		Layout:  portabledoc.SurfaceLayoutImageCenter,
		Content: headerText("Visible text"),
	})
	got := b.headerBlock(doc)

	// No image → text should be visible as fallback
	if !strings.Contains(got, "Visible text") {
		t.Errorf("center layout without image should show text, got %q", got)
	}
}

func TestHeaderBlock_ImageOnlyRight(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled:    true,
		Layout:     portabledoc.SurfaceLayoutImageRight,
		ImageURL:   "data:image/png;base64,abc",
		ImageWidth: 80,
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "#align(right)") {
		t.Errorf("expected right alignment for image-only, got %q", got)
	}
}

func TestHeaderBlock_InjectableImage(t *testing.T) {
	b := newTestBuilderWithInjectables(map[string]any{
		"logo_var": "https://example.com/logo.png",
	})
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled:           true,
		Layout:            portabledoc.SurfaceLayoutImageLeft,
		ImageInjectableID: "logo_var",
		ImageWidth:        120,
		ImageHeight:       40,
		Content:           headerText("Corp"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "#image(") {
		t.Errorf("expected image directive for injectable, got %q", got)
	}
	if !strings.Contains(got, `fit: "contain"`) {
		t.Errorf("expected fit contain for injectable image, got %q", got)
	}
	if !strings.Contains(got, "#grid(") {
		t.Errorf("expected grid layout, got %q", got)
	}
}

func TestHeaderBlock_StaticImageUsesFitStretch(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled:    true,
		Layout:     portabledoc.SurfaceLayoutImageLeft,
		ImageURL:   "data:image/png;base64,abc",
		ImageWidth: 100,
		Content:    headerText("Text"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, `fit: "stretch"`) {
		t.Errorf("expected fit stretch for static image, got %q", got)
	}
}

func TestHeaderBlock_UnresolvedInjectable(t *testing.T) {
	b := newTestBuilder() // no injectables
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled:           true,
		Layout:            portabledoc.SurfaceLayoutImageLeft,
		ImageInjectableID: "missing_var",
		Content:           headerText("Corp"),
	})
	got := b.headerBlock(doc)

	// Should still render text-only (no image, injectable not resolved)
	if !strings.Contains(got, "Corp") {
		t.Errorf("expected text content, got %q", got)
	}
	// Should not contain grid (no image to lay out)
	if strings.Contains(got, "#grid(") {
		t.Errorf("expected no grid for unresolved injectable, got %q", got)
	}
}

func TestHeaderBlock_ImageWithDimensions(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled:     true,
		Layout:      portabledoc.SurfaceLayoutImageLeft,
		ImageURL:    "data:image/png;base64,abc",
		ImageWidth:  100,
		ImageHeight: 60,
		Content:     headerText("Text"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "75.0pt") {
		t.Errorf("expected width 75.0pt, got %q", got)
	}
	if !strings.Contains(got, "height: 45.0pt") { // 60 * 0.75
		t.Errorf("expected height 45.0pt, got %q", got)
	}
}

func TestHeaderBlock_RespectsTextAlign(t *testing.T) {
	b := newTestBuilder()
	text := "Right Aligned"
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: true,
		Content: &portabledoc.ProseMirrorDoc{
			Type: "doc",
			Content: []portabledoc.Node{
				{
					Type:    portabledoc.NodeTypeParagraph,
					Attrs:   map[string]any{"textAlign": "right"},
					Content: []portabledoc.Node{textNode(text)},
				},
			},
		},
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "#align(right)") {
		t.Errorf("expected right alignment in header text, got %q", got)
	}
	if !strings.Contains(got, text) {
		t.Errorf("expected text content, got %q", got)
	}
}

func TestHeaderBlock_UsesNativePageHeader(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: true,
		Content: headerText("Test"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "#set page(header: context {") {
		t.Errorf("expected native page header directive, got %q", got)
	}
	if !strings.Contains(got, "counter(page).get()") {
		t.Errorf("expected first-page detection via counter(page), got %q", got)
	}
	if !strings.Contains(got, "if current == 1") {
		t.Errorf("expected first-page conditional, got %q", got)
	}
}

func TestHeaderBlock_EnforcesSurfaceHeight(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: true,
		Content: headerText("Short text"),
	})
	got := b.headerBlock(doc)

	// 120px surface * 0.75 = 90.0pt, 12px padding * 0.75 = 9.0pt (inside context block)
	if !strings.Contains(got, "height: 90.0pt") || !strings.Contains(got, "inset: (top: 9.0pt, bottom: 9.0pt)") {
		t.Errorf("expected surface-height block wrapper inside context, got %q", got)
	}
}

func TestBuild_IncludesHeader(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: true,
		Content: headerText("Header Title"),
	})
	got := b.Build(doc)

	if !strings.Contains(got, "Header Title") {
		t.Errorf("expected Build output to include header, got %q", got)
	}
}

func TestBuild_ReservesTopMarginWhenHeaderEnabled(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: true,
		Content: headerText("Header Title"),
	})

	got := b.Build(doc)

	// Top margin = header surface height (120px * 0.75 = 90pt)
	if !strings.Contains(got, "margin: (top: 90.0pt, bottom: 54.0pt, left: 54.0pt, right: 54.0pt)") {
		t.Errorf("expected top margin to equal header surface height when header is enabled, got %q", got)
	}
}

func TestBuild_KeepsTopMarginWhenHeaderDisabled(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(nil)

	got := b.Build(doc)

	if !strings.Contains(got, "margin: (top: 54.0pt, bottom: 54.0pt, left: 54.0pt, right: 54.0pt)") {
		t.Errorf("expected top margin to stay unchanged without header, got %q", got)
	}
}

func TestBuild_NoHeaderForOldDoc(t *testing.T) {
	b := newTestBuilder()
	doc := &portabledoc.Document{
		Version: "1.1.0",
		PageConfig: portabledoc.PageConfig{
			FormatID: portabledoc.PageFormatA4,
			Width:    595, Height: 842,
			Margins: portabledoc.Margins{Top: 72, Bottom: 72, Left: 72, Right: 72},
		},
		Content: &portabledoc.ProseMirrorDoc{
			Type: "doc",
			Content: []portabledoc.Node{
				paragraphNode(textNode("Body content")),
			},
		},
	}
	got := b.Build(doc)

	if !strings.Contains(got, "Body content") {
		t.Errorf("expected body content, got %q", got)
	}
	// No header directive should be present
	if strings.Contains(got, "#set page(header:") {
		t.Errorf("expected no header directive for doc without header")
	}
}

func TestNormalizeSurfaceTextNodes_MergesParagraphs(t *testing.T) {
	nodes := []portabledoc.Node{
		paragraphNode(textNode("Line 1")),
		paragraphNode(textNode("Line 2")),
	}
	result := normalizeSurfaceTextNodes(nodes)
	if len(result) != 1 {
		t.Fatalf("expected 1 merged node, got %d", len(result))
	}
	// Should contain a hard break between the two text nodes
	hasBreak := false
	for _, child := range result[0].Content {
		if child.Type == portabledoc.NodeTypeHardBreak {
			hasBreak = true
		}
	}
	if !hasBreak {
		t.Error("expected hard break in merged paragraph")
	}
}

// =============================================================================
// Footer Block Tests
// =============================================================================

func testDocWithFooter(footer *portabledoc.DocumentFooter) *portabledoc.Document {
	return &portabledoc.Document{
		Version: portabledoc.CurrentVersion,
		PageConfig: portabledoc.PageConfig{
			FormatID: portabledoc.PageFormatA4,
			Width:    595, Height: 842,
			Margins: portabledoc.Margins{Top: 72, Bottom: 72, Left: 72, Right: 72},
		},
		Footer:  footer,
		Content: &portabledoc.ProseMirrorDoc{Type: "doc"},
	}
}

func footerText(text string) *portabledoc.ProseMirrorDoc {
	return &portabledoc.ProseMirrorDoc{
		Type: "doc",
		Content: []portabledoc.Node{
			paragraphNode(textNode(text)),
		},
	}
}

func TestFooterBlock_NilFooter(t *testing.T) {
	b := newTestBuilder()
	doc := testDocWithFooter(nil)
	got := b.footerBlock(doc)

	if got != "" {
		t.Errorf("expected empty string for nil footer, got %q", got)
	}
}

func TestFooterBlock_DisabledFooter(t *testing.T) {
	b := newTestBuilder()
	doc := testDocWithFooter(&portabledoc.DocumentFooter{Enabled: false})
	got := b.footerBlock(doc)

	if got != "" {
		t.Errorf("expected empty string for disabled footer, got %q", got)
	}
}

func TestFooterBlock_TextOnly(t *testing.T) {
	b := newTestBuilder()
	doc := testDocWithFooter(&portabledoc.DocumentFooter{
		Enabled: true,
		Content: footerText("Footer Text"),
	})
	got := b.footerBlock(doc)

	if !strings.Contains(got, "Footer Text") {
		t.Errorf("expected footer to contain text, got %q", got)
	}
}

func TestFooterBlock_UsesNativePageFooter(t *testing.T) {
	b := newTestBuilder()
	doc := testDocWithFooter(&portabledoc.DocumentFooter{
		Enabled: true,
		Content: footerText("Test"),
	})
	got := b.footerBlock(doc)

	if !strings.Contains(got, "#set page(footer: context {") {
		t.Errorf("expected native page footer directive, got %q", got)
	}
	if !strings.Contains(got, "counter(page).final()") {
		t.Errorf("expected last-page detection via counter(page), got %q", got)
	}
	if !strings.Contains(got, "if current == total") {
		t.Errorf("expected last-page conditional, got %q", got)
	}
}

func TestFooterBlock_EnforcesSurfaceHeight(t *testing.T) {
	b := newTestBuilder()
	doc := testDocWithFooter(&portabledoc.DocumentFooter{
		Enabled: true,
		Content: footerText("Short text"),
	})
	got := b.footerBlock(doc)

	// Same surface height as header: 90.0pt with 9.0pt inset
	if !strings.Contains(got, "#block(width: 100%, height: 90.0pt, inset: (top: 9.0pt, bottom: 9.0pt), clip: true)") {
		t.Errorf("expected surface-height block wrapper, got %q", got)
	}
}

func TestBuild_IncludesFooter(t *testing.T) {
	b := newTestBuilder()
	doc := testDocWithFooter(&portabledoc.DocumentFooter{
		Enabled: true,
		Content: footerText("Footer Title"),
	})
	got := b.Build(doc)

	if !strings.Contains(got, "Footer Title") {
		t.Errorf("expected Build output to include footer, got %q", got)
	}
}

func TestBuild_ReservesBottomMarginWhenFooterEnabled(t *testing.T) {
	b := newTestBuilder()
	doc := testDocWithFooter(&portabledoc.DocumentFooter{
		Enabled: true,
		Content: footerText("Footer"),
	})
	got := b.Build(doc)

	// Bottom margin = footer surface height (120px * 0.75 = 90pt)
	if !strings.Contains(got, "margin: (top: 54.0pt, bottom: 90.0pt, left: 54.0pt, right: 54.0pt)") {
		t.Errorf("expected bottom margin to equal footer surface height when footer is enabled, got %q", got)
	}
}

func TestBuild_KeepsBottomMarginWhenFooterDisabled(t *testing.T) {
	b := newTestBuilder()
	doc := testDocWithFooter(nil)
	got := b.Build(doc)

	if !strings.Contains(got, "margin: (top: 54.0pt, bottom: 54.0pt, left: 54.0pt, right: 54.0pt)") {
		t.Errorf("expected bottom margin to stay unchanged without footer, got %q", got)
	}
}

func TestBuild_HeaderAndFooter(t *testing.T) {
	b := newTestBuilder()
	doc := &portabledoc.Document{
		Version: portabledoc.CurrentVersion,
		PageConfig: portabledoc.PageConfig{
			FormatID: portabledoc.PageFormatA4,
			Width:    595, Height: 842,
			Margins: portabledoc.Margins{Top: 72, Bottom: 72, Left: 72, Right: 72},
		},
		Header: &portabledoc.DocumentHeader{
			Enabled: true,
			Content: headerText("Header"),
		},
		Footer: &portabledoc.DocumentFooter{
			Enabled: true,
			Content: footerText("Footer"),
		},
		Content: &portabledoc.ProseMirrorDoc{Type: "doc"},
	}
	got := b.Build(doc)

	if !strings.Contains(got, "Header") {
		t.Error("expected header in output")
	}
	if !strings.Contains(got, "Footer") {
		t.Error("expected footer in output")
	}
	if !strings.Contains(got, "margin: (top: 90.0pt, bottom: 90.0pt, left: 54.0pt, right: 54.0pt)") {
		t.Errorf("expected both margins = surface height (90pt), got %q", got)
	}
}
