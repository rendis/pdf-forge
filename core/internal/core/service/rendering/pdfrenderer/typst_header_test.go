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
		Layout:     portabledoc.HeaderLayoutImageLeft,
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
		Layout:     portabledoc.HeaderLayoutImageRight,
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
		Layout:     portabledoc.HeaderLayoutImageCenter,
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
		Layout:  portabledoc.HeaderLayoutImageCenter,
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
		Layout:     portabledoc.HeaderLayoutImageRight,
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
		Layout:            portabledoc.HeaderLayoutImageLeft,
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
		Layout:     portabledoc.HeaderLayoutImageLeft,
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
		Layout:            portabledoc.HeaderLayoutImageLeft,
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
		Layout:      portabledoc.HeaderLayoutImageLeft,
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

func TestHeaderBlock_HasSpacingAfter(t *testing.T) {
	b := newTestBuilder()
	doc := testDoc(&portabledoc.DocumentHeader{
		Enabled: true,
		Content: headerText("Test"),
	})
	got := b.headerBlock(doc)

	if !strings.Contains(got, "#v(1.5em)") {
		t.Errorf("expected spacing after header, got %q", got)
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
	// No header surface should be present
	if strings.Contains(got, "#place(top + left") {
		t.Errorf("expected no header surface for doc without header")
	}
}

func TestNormalizeHeaderTextNodes_MergesParagraphs(t *testing.T) {
	nodes := []portabledoc.Node{
		paragraphNode(textNode("Line 1")),
		paragraphNode(textNode("Line 2")),
	}
	result := normalizeHeaderTextNodes(nodes)
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
