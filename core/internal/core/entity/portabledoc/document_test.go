package portabledoc

import "testing"

func TestHeaderEnabled_NilHeader(t *testing.T) {
	doc := &Document{}
	if doc.HeaderEnabled() {
		t.Error("expected HeaderEnabled() == false for nil header")
	}
}

func TestHeaderEnabled_DisabledHeader(t *testing.T) {
	doc := &Document{Header: &DocumentHeader{Enabled: false}}
	if doc.HeaderEnabled() {
		t.Error("expected HeaderEnabled() == false for disabled header")
	}
}

func TestHeaderEnabled_EnabledHeader(t *testing.T) {
	doc := &Document{Header: &DocumentHeader{Enabled: true}}
	if !doc.HeaderEnabled() {
		t.Error("expected HeaderEnabled() == true")
	}
}

func TestHasHeaderImage_StaticImage(t *testing.T) {
	h := &DocumentHeader{ImageURL: "https://example.com/logo.png"}
	if !h.HasHeaderImage() {
		t.Error("expected HasHeaderImage() == true for static image")
	}
}

func TestHasHeaderImage_InjectableImage(t *testing.T) {
	h := &DocumentHeader{ImageInjectableID: "logo_var"}
	if !h.HasHeaderImage() {
		t.Error("expected HasHeaderImage() == true for injectable image")
	}
}

func TestHasHeaderImage_NoImage(t *testing.T) {
	h := &DocumentHeader{}
	if h.HasHeaderImage() {
		t.Error("expected HasHeaderImage() == false for empty header")
	}
}

func TestImageInjectableIDs_BodyOnly(t *testing.T) {
	doc := &Document{
		Content: &ProseMirrorDoc{
			Type: "doc",
			Content: []Node{
				{Type: NodeTypeCustomImage, Attrs: map[string]any{"injectableId": "img_body"}},
			},
		},
	}
	ids := doc.ImageInjectableIDs()
	if len(ids) != 1 || ids[0] != "img_body" {
		t.Errorf("expected [img_body], got %v", ids)
	}
}

func TestImageInjectableIDs_HeaderOnly(t *testing.T) {
	doc := &Document{
		Header:  &DocumentHeader{ImageInjectableID: "img_header"},
		Content: &ProseMirrorDoc{Type: "doc"},
	}
	ids := doc.ImageInjectableIDs()
	if len(ids) != 1 || ids[0] != "img_header" {
		t.Errorf("expected [img_header], got %v", ids)
	}
}

func TestImageInjectableIDs_Both(t *testing.T) {
	doc := &Document{
		Header: &DocumentHeader{ImageInjectableID: "img_header"},
		Content: &ProseMirrorDoc{
			Type: "doc",
			Content: []Node{
				{Type: NodeTypeCustomImage, Attrs: map[string]any{"injectableId": "img_body"}},
			},
		},
	}
	ids := doc.ImageInjectableIDs()
	if len(ids) != 2 {
		t.Errorf("expected 2 IDs, got %v", ids)
	}
}

func TestImageInjectableIDs_Dedup(t *testing.T) {
	doc := &Document{
		Header: &DocumentHeader{ImageInjectableID: "same_id"},
		Content: &ProseMirrorDoc{
			Type: "doc",
			Content: []Node{
				{Type: NodeTypeCustomImage, Attrs: map[string]any{"injectableId": "same_id"}},
			},
		},
	}
	ids := doc.ImageInjectableIDs()
	if len(ids) != 1 {
		t.Errorf("expected 1 deduped ID, got %v", ids)
	}
}

func TestImageInjectableIDs_None(t *testing.T) {
	doc := &Document{
		Content: &ProseMirrorDoc{
			Type: "doc",
			Content: []Node{
				{Type: NodeTypeCustomImage, Attrs: map[string]any{"src": "https://example.com/img.png"}},
			},
		},
	}
	ids := doc.ImageInjectableIDs()
	if len(ids) != 0 {
		t.Errorf("expected 0 IDs, got %v", ids)
	}
}

func TestImageInjectableIDs_SkipsRegularImage(t *testing.T) {
	doc := &Document{
		Content: &ProseMirrorDoc{
			Type: "doc",
			Content: []Node{
				{Type: NodeTypeImage, Attrs: map[string]any{"injectableId": "img_regular"}},
				{Type: NodeTypeParagraph},
			},
		},
	}
	ids := doc.ImageInjectableIDs()
	if len(ids) != 1 || ids[0] != "img_regular" {
		t.Errorf("expected [img_regular], got %v", ids)
	}
}
