package pdfrenderer

import (
	"strings"
	"testing"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/entity/portabledoc"
)

// --- Helpers ---

func textNode(s string) portabledoc.Node {
	return portabledoc.Node{Type: portabledoc.NodeTypeText, Text: &s}
}

func markedTextNode(s string, marks ...portabledoc.Mark) portabledoc.Node {
	return portabledoc.Node{Type: portabledoc.NodeTypeText, Text: &s, Marks: marks}
}

func mark(typ string, attrs ...map[string]any) portabledoc.Mark {
	m := portabledoc.Mark{Type: typ}
	if len(attrs) > 0 {
		m.Attrs = attrs[0]
	}
	return m
}

func paragraphNode(children ...portabledoc.Node) portabledoc.Node {
	return portabledoc.Node{Type: portabledoc.NodeTypeParagraph, Content: children}
}

func newConverter(injectables map[string]any, defaults map[string]string) *TypstConverter {
	if injectables == nil {
		injectables = map[string]any{}
	}
	if defaults == nil {
		defaults = map[string]string{}
	}
	return NewTypstConverter(injectables, defaults)
}

// --- Text & Marks ---

func TestTypstConverter_TextPlain(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(textNode("Hello world"))
	if got != "Hello world" {
		t.Errorf("got %q, want %q", got, "Hello world")
	}
}

func TestTypstConverter_TextNil(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(portabledoc.Node{Type: portabledoc.NodeTypeText})
	if got != "" {
		t.Errorf("got %q, want empty", got)
	}
}

func TestTypstConverter_TextEscaping(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(textNode("price is $10 #tag *bold* _italic_"))
	for _, special := range []string{"\\$", "\\#", "\\*", "\\_"} {
		if !strings.Contains(got, special) {
			t.Errorf("expected %q to contain %q", got, special)
		}
	}
}

func TestTypstConverter_MarkBold(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("hello", mark(portabledoc.MarkTypeBold)))
	if got != "*hello*" {
		t.Errorf("got %q, want %q", got, "*hello*")
	}
}

func TestTypstConverter_MarkItalic(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("hello", mark(portabledoc.MarkTypeItalic)))
	if got != "_hello_" {
		t.Errorf("got %q, want %q", got, "_hello_")
	}
}

func TestTypstConverter_MarkStrike(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("hello", mark(portabledoc.MarkTypeStrike)))
	if got != "#strike[hello]" {
		t.Errorf("got %q, want %q", got, "#strike[hello]")
	}
}

func TestTypstConverter_MarkCode(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("x := 1", mark(portabledoc.MarkTypeCode)))
	if got != "`x := 1`" {
		t.Errorf("got %q, want %q", got, "`x := 1`")
	}
}

func TestTypstConverter_MarkUnderline(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("hello", mark(portabledoc.MarkTypeUnderline)))
	if got != "#underline[hello]" {
		t.Errorf("got %q, want %q", got, "#underline[hello]")
	}
}

func TestTypstConverter_MarkHighlight(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("hello", mark(portabledoc.MarkTypeHighlight)))
	if !strings.Contains(got, "#highlight") && !strings.Contains(got, "#ffeb3b") {
		t.Errorf("expected highlight markup, got %q", got)
	}
}

func TestTypstConverter_MarkHighlightCustomColor(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("hello", mark(portabledoc.MarkTypeHighlight, map[string]any{"color": "#ff0000"})))
	if !strings.Contains(got, "#ff0000") {
		t.Errorf("expected custom color, got %q", got)
	}
}

func TestTypstConverter_MarkLink(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("click", mark(portabledoc.MarkTypeLink, map[string]any{"href": "https://example.com"})))
	want := `#link("https://example.com")[click]`
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestTypstConverter_MarkLinkEmptyHref(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("click", mark(portabledoc.MarkTypeLink, map[string]any{"href": ""})))
	if got != "click" {
		t.Errorf("got %q, want %q", got, "click")
	}
}

func TestTypstConverter_NestedMarks(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(markedTextNode("hello", mark(portabledoc.MarkTypeBold), mark(portabledoc.MarkTypeItalic)))
	if got != "_*hello*_" {
		t.Errorf("got %q, want %q", got, "_*hello*_")
	}
}

// --- Paragraph ---

func TestTypstConverter_Paragraph(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(paragraphNode(textNode("Hello")))
	if got != "Hello\n\n" {
		t.Errorf("got %q, want %q", got, "Hello\n\n")
	}
}

func TestTypstConverter_ParagraphEmpty(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(paragraphNode())
	if !strings.Contains(got, "#v(") {
		t.Errorf("empty paragraph should produce vertical space, got %q", got)
	}
}

// --- Heading ---

func TestTypstConverter_Headings(t *testing.T) {
	tests := []struct {
		level float64
		want  string
	}{
		{1, "= Title\n"},
		{2, "== Title\n"},
		{3, "=== Title\n"},
		{4, "==== Title\n"},
		{5, "===== Title\n"},
		{6, "====== Title\n"},
	}

	for _, tt := range tests {
		c := newConverter(nil, nil)
		node := portabledoc.Node{
			Type:    portabledoc.NodeTypeHeading,
			Attrs:   map[string]any{"level": tt.level},
			Content: []portabledoc.Node{textNode("Title")},
		}
		got := c.ConvertNode(node)
		if got != tt.want {
			t.Errorf("level %.0f: got %q, want %q", tt.level, got, tt.want)
		}
	}
}

func TestTypstConverter_HeadingDefaultLevel(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:    portabledoc.NodeTypeHeading,
		Content: []portabledoc.Node{textNode("Title")},
	}
	got := c.ConvertNode(node)
	if !strings.HasPrefix(got, "= ") {
		t.Errorf("expected level 1 heading, got %q", got)
	}
}

// --- Blockquote ---

func TestTypstConverter_Blockquote(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:    portabledoc.NodeTypeBlockquote,
		Content: []portabledoc.Node{paragraphNode(textNode("quote"))},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "#block(") || !strings.Contains(got, "#emph") {
		t.Errorf("expected blockquote markup, got %q", got)
	}
}

// --- CodeBlock ---

func TestTypstConverter_CodeBlock(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:    portabledoc.NodeTypeCodeBlock,
		Content: []portabledoc.Node{textNode("fmt.Println()")},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "```") {
		t.Errorf("expected code block markup, got %q", got)
	}
}

func TestTypstConverter_CodeBlockWithLanguage(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:    portabledoc.NodeTypeCodeBlock,
		Attrs:   map[string]any{"language": "go"},
		Content: []portabledoc.Node{textNode("fmt.Println()")},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "```go") {
		t.Errorf("expected language annotation, got %q", got)
	}
}

// --- Horizontal Rule ---

func TestTypstConverter_HorizontalRule(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(portabledoc.Node{Type: portabledoc.NodeTypeHR})
	if !strings.Contains(got, "#line(") {
		t.Errorf("expected line markup, got %q", got)
	}
}

// --- Lists ---

func TestTypstConverter_BulletList(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeBulletList,
		Content: []portabledoc.Node{
			{Type: portabledoc.NodeTypeListItem, Content: []portabledoc.Node{paragraphNode(textNode("item1"))}},
			{Type: portabledoc.NodeTypeListItem, Content: []portabledoc.Node{paragraphNode(textNode("item2"))}},
		},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "- item1") || !strings.Contains(got, "- item2") {
		t.Errorf("expected bullet list items, got %q", got)
	}
}

func TestTypstConverter_OrderedList(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeOrderedList,
		Content: []portabledoc.Node{
			{Type: portabledoc.NodeTypeListItem, Content: []portabledoc.Node{paragraphNode(textNode("first"))}},
			{Type: portabledoc.NodeTypeListItem, Content: []portabledoc.Node{paragraphNode(textNode("second"))}},
		},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "+ first") || !strings.Contains(got, "+ second") {
		t.Errorf("expected ordered list items, got %q", got)
	}
}

func TestTypstConverter_OrderedListCustomStart(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeOrderedList,
		Attrs: map[string]any{"start": float64(5)},
		Content: []portabledoc.Node{
			{Type: portabledoc.NodeTypeListItem, Content: []portabledoc.Node{paragraphNode(textNode("fifth"))}},
		},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "#set enum(start: 5)") {
		t.Errorf("expected custom start, got %q", got)
	}
}

func TestTypstConverter_TaskList(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeTaskList,
		Content: []portabledoc.Node{
			{Type: portabledoc.NodeTypeTaskItem, Attrs: map[string]any{"checked": true}, Content: []portabledoc.Node{paragraphNode(textNode("done"))}},
			{Type: portabledoc.NodeTypeTaskItem, Attrs: map[string]any{"checked": false}, Content: []portabledoc.Node{paragraphNode(textNode("todo"))}},
		},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "☑") || !strings.Contains(got, "☐") {
		t.Errorf("expected task markers, got %q", got)
	}
}

// --- Page Break ---

func TestTypstConverter_PageBreak(t *testing.T) {
	c := newConverter(nil, nil)
	got := c.ConvertNode(portabledoc.Node{Type: portabledoc.NodeTypePageBreak})
	if got != "#pagebreak()\n" {
		t.Errorf("got %q, want %q", got, "#pagebreak()\n")
	}
	if c.GetCurrentPage() != 2 {
		t.Errorf("page count should be 2 after pagebreak, got %d", c.GetCurrentPage())
	}
}

func TestTypstConverter_MultiplePageBreaks(t *testing.T) {
	c := newConverter(nil, nil)
	c.ConvertNode(portabledoc.Node{Type: portabledoc.NodeTypePageBreak})
	c.ConvertNode(portabledoc.Node{Type: portabledoc.NodeTypePageBreak})
	c.ConvertNode(portabledoc.Node{Type: portabledoc.NodeTypePageBreak})
	if c.GetCurrentPage() != 4 {
		t.Errorf("expected page 4, got %d", c.GetCurrentPage())
	}
}

// --- Image ---

func TestTypstConverter_Image(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeImage,
		Attrs: map[string]any{"src": "https://example.com/img.png", "width": float64(200)},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "#image(") || !strings.Contains(got, "150pt") {
		t.Errorf("expected image with 150pt width (200*0.75), got %q", got)
	}
	// Remote URL should be registered
	if !strings.Contains(got, "img_1.png") {
		t.Errorf("expected local filename, got %q", got)
	}
}

func TestTypstConverter_ImageCenter(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeImage,
		Attrs: map[string]any{"src": "https://example.com/img.png", "align": "center"},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "#align(center)") {
		t.Errorf("expected center alignment, got %q", got)
	}
	if !strings.Contains(got, "img_1.png") {
		t.Errorf("expected local filename for remote URL, got %q", got)
	}
}

func TestTypstConverter_ImageEmptySrc(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeImage,
		Attrs: map[string]any{"src": ""},
	}
	got := c.ConvertNode(node)
	if got != "" {
		t.Errorf("expected empty output for empty src, got %q", got)
	}
}

func TestTypstConverter_ImageInjectable(t *testing.T) {
	c := newConverter(map[string]any{"img1": "https://resolved.com/photo.jpg"}, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeImage,
		Attrs: map[string]any{"src": "", "injectableId": "img1"},
	}
	got := c.ConvertNode(node)
	// Remote URLs are replaced with local filenames for Typst
	if !strings.Contains(got, "img_1.jpg") {
		t.Errorf("expected local image filename, got %q", got)
	}
	if len(c.RemoteImages()) != 1 {
		t.Errorf("expected 1 remote image registered, got %d", len(c.RemoteImages()))
	}
}

// --- Injector ---

func TestTypstConverter_InjectorWithValue(t *testing.T) {
	c := newConverter(map[string]any{"var1": "John Doe"}, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeInjector,
		Attrs: map[string]any{"variableId": "var1", "label": "Name"},
	}
	got := c.ConvertNode(node)
	if got != "John Doe" {
		t.Errorf("got %q, want %q", got, "John Doe")
	}
}

func TestTypstConverter_InjectorWithDefault(t *testing.T) {
	c := newConverter(nil, map[string]string{"var1": "Default Name"})
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeInjector,
		Attrs: map[string]any{"variableId": "var1", "label": "Name"},
	}
	got := c.ConvertNode(node)
	if got != "Default Name" {
		t.Errorf("got %q, want %q", got, "Default Name")
	}
}

func TestTypstConverter_InjectorEmpty(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeInjector,
		Attrs: map[string]any{"variableId": "var1", "label": "Name"},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "#text(fill: luma(136)") || !strings.Contains(got, "Name") {
		t.Errorf("expected placeholder markup, got %q", got)
	}
}

func TestTypstConverter_InjectorCurrency(t *testing.T) {
	c := newConverter(map[string]any{"price": float64(99.5)}, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeInjector,
		Attrs: map[string]any{"variableId": "price", "type": "CURRENCY", "format": "$"},
	}
	got := c.ConvertNode(node)
	if got != "\\$ 99.50" {
		t.Errorf("got %q, want %q", got, "\\$ 99.50")
	}
}

func TestTypstConverter_InjectorBoolean(t *testing.T) {
	c := newConverter(map[string]any{"active": true}, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeInjector,
		Attrs: map[string]any{"variableId": "active"},
	}
	got := c.ConvertNode(node)
	if got != "Sí" {
		t.Errorf("got %q, want %q", got, "Sí")
	}
}

func TestTypstConverter_InjectorNumber(t *testing.T) {
	c := newConverter(map[string]any{"count": float64(42)}, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeInjector,
		Attrs: map[string]any{"variableId": "count"},
	}
	got := c.ConvertNode(node)
	if got != "42" {
		t.Errorf("got %q, want %q", got, "42")
	}
}

// --- Conditional ---

func TestTypstConverter_ConditionalTrue(t *testing.T) {
	c := newConverter(map[string]any{"status": "active"}, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeConditional,
		Attrs: map[string]any{
			"conditions": map[string]any{
				"logic": "AND",
				"children": []any{
					map[string]any{
						"type":       "rule",
						"variableId": "status",
						"operator":   "eq",
						"value":      map[string]any{"mode": "text", "value": "active"},
					},
				},
			},
		},
		Content: []portabledoc.Node{paragraphNode(textNode("Visible"))},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "Visible") {
		t.Errorf("expected visible content, got %q", got)
	}
}

func TestTypstConverter_ConditionalFalse(t *testing.T) {
	c := newConverter(map[string]any{"status": "inactive"}, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeConditional,
		Attrs: map[string]any{
			"conditions": map[string]any{
				"logic": "AND",
				"children": []any{
					map[string]any{
						"type":       "rule",
						"variableId": "status",
						"operator":   "eq",
						"value":      map[string]any{"mode": "text", "value": "active"},
					},
				},
			},
		},
		Content: []portabledoc.Node{paragraphNode(textNode("Hidden"))},
	}
	got := c.ConvertNode(node)
	if got != "" {
		t.Errorf("expected empty, got %q", got)
	}
}

func TestTypstConverter_ConditionalOR(t *testing.T) {
	c := newConverter(map[string]any{"a": "no", "b": "yes"}, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeConditional,
		Attrs: map[string]any{
			"conditions": map[string]any{
				"logic": "OR",
				"children": []any{
					map[string]any{"type": "rule", "variableId": "a", "operator": "eq", "value": map[string]any{"mode": "text", "value": "yes"}},
					map[string]any{"type": "rule", "variableId": "b", "operator": "eq", "value": map[string]any{"mode": "text", "value": "yes"}},
				},
			},
		},
		Content: []portabledoc.Node{paragraphNode(textNode("OR result"))},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "OR result") {
		t.Errorf("OR condition should pass, got %q", got)
	}
}

func TestTypstConverter_ConditionalEmpty(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeConditional,
		Attrs: map[string]any{
			"conditions": map[string]any{
				"logic": "AND",
				"children": []any{
					map[string]any{"type": "rule", "variableId": "x", "operator": "empty", "value": map[string]any{"mode": "text", "value": ""}},
				},
			},
		},
		Content: []portabledoc.Node{paragraphNode(textNode("Empty"))},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "Empty") {
		t.Errorf("empty operator should match nil, got %q", got)
	}
}

func TestTypstConverter_ConditionalNoConditions(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:    portabledoc.NodeTypeConditional,
		Attrs:   map[string]any{},
		Content: []portabledoc.Node{paragraphNode(textNode("Always"))},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "Always") {
		t.Errorf("no conditions should default to true, got %q", got)
	}
}

// --- Table (user-created) ---

func TestTypstConverter_Table(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeTable,
		Content: []portabledoc.Node{
			{
				Type: portabledoc.NodeTypeTableRow,
				Content: []portabledoc.Node{
					{Type: portabledoc.NodeTypeTableHeader, Content: []portabledoc.Node{paragraphNode(textNode("Name"))}},
					{Type: portabledoc.NodeTypeTableHeader, Content: []portabledoc.Node{paragraphNode(textNode("Age"))}},
				},
			},
			{
				Type: portabledoc.NodeTypeTableRow,
				Content: []portabledoc.Node{
					{Type: portabledoc.NodeTypeTableCell, Content: []portabledoc.Node{paragraphNode(textNode("Alice"))}},
					{Type: portabledoc.NodeTypeTableCell, Content: []portabledoc.Node{paragraphNode(textNode("30"))}},
				},
			},
		},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "#table(") {
		t.Errorf("expected #table(, got %q", got)
	}
	if !strings.Contains(got, "Name") || !strings.Contains(got, "Age") {
		t.Errorf("expected header labels, got %q", got)
	}
	if !strings.Contains(got, "Alice") || !strings.Contains(got, "30") {
		t.Errorf("expected data cells, got %q", got)
	}
}

func TestTypstConverter_TableWithColspan(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type: portabledoc.NodeTypeTable,
		Content: []portabledoc.Node{
			{
				Type: portabledoc.NodeTypeTableRow,
				Content: []portabledoc.Node{
					{Type: portabledoc.NodeTypeTableHeader, Attrs: map[string]any{"colspan": float64(2)}, Content: []portabledoc.Node{paragraphNode(textNode("Merged"))}},
				},
			},
		},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "colspan: 2") {
		t.Errorf("expected colspan: 2, got %q", got)
	}
}

// --- Table Injector ---

func TestTypstConverter_TableInjector(t *testing.T) {
	tv := entity.NewTableValue()
	tv.AddColumn("name", map[string]string{"en": "Name", "es": "Nombre"}, entity.ValueTypeString)
	tv.AddColumn("amount", map[string]string{"en": "Amount"}, entity.ValueTypeNumber)
	tv.AddRow(
		entity.Cell(entity.StringValue("Item A")),
		entity.Cell(entity.NumberValue(100)),
	)
	tv.AddRow(
		entity.Cell(entity.StringValue("Item B")),
		entity.Cell(entity.NumberValue(200)),
	)

	c := newConverter(map[string]any{"table1": tv}, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeTableInjector,
		Attrs: map[string]any{"variableId": "table1", "lang": "en"},
	}
	got := c.ConvertNode(node)

	if !strings.Contains(got, "#table(") {
		t.Errorf("expected #table(, got %q", got)
	}
	if !strings.Contains(got, "Name") || !strings.Contains(got, "Amount") {
		t.Errorf("expected column headers, got %q", got)
	}
	if !strings.Contains(got, "Item A") || !strings.Contains(got, "Item B") {
		t.Errorf("expected row data, got %q", got)
	}
}

func TestTypstConverter_TableInjectorSpanish(t *testing.T) {
	tv := entity.NewTableValue()
	tv.AddColumn("name", map[string]string{"en": "Name", "es": "Nombre"}, entity.ValueTypeString)
	tv.AddRow(entity.Cell(entity.StringValue("X")))

	c := newConverter(map[string]any{"t1": tv}, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeTableInjector,
		Attrs: map[string]any{"variableId": "t1", "lang": "es"},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "Nombre") {
		t.Errorf("expected Spanish label, got %q", got)
	}
}

func TestTypstConverter_TableInjectorMissing(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:  portabledoc.NodeTypeTableInjector,
		Attrs: map[string]any{"variableId": "missing", "label": "My Table"},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "My Table") || !strings.Contains(got, "#block(") {
		t.Errorf("expected placeholder, got %q", got)
	}
}

// --- Escaping ---

func TestEscapeTypst(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"hello", "hello"},
		{"$100", "\\$100"},
		{"#tag", "\\#tag"},
		{"*bold*", "\\*bold\\*"},
		{"a_b", "a\\_b"},
		{"<>", "\\<\\>"},
		{"[x]", "\\[x\\]"},
		{"@ref", "\\@ref"},
	}
	for _, tt := range tests {
		got := escapeTypst(tt.input)
		if got != tt.want {
			t.Errorf("escapeTypst(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestUnescapeTypst(t *testing.T) {
	original := "$100 #tag *bold* _underscored_"
	escaped := escapeTypst(original)
	unescaped := unescapeTypst(escaped)
	if unescaped != original {
		t.Errorf("round-trip failed: %q -> %q -> %q", original, escaped, unescaped)
	}
}

func TestEscapeTypstString(t *testing.T) {
	got := escapeTypstString(`he said "hello" and \ that`)
	want := `he said \"hello\" and \\ that`
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

// --- ConvertNodes batch ---

func TestTypstConverter_ConvertNodes(t *testing.T) {
	c := newConverter(nil, nil)
	nodes := []portabledoc.Node{
		paragraphNode(textNode("First")),
		paragraphNode(textNode("Second")),
	}
	got := c.ConvertNodes(nodes)
	if !strings.Contains(got, "First") || !strings.Contains(got, "Second") {
		t.Errorf("expected both paragraphs, got %q", got)
	}
}

// --- Unknown node ---

func TestTypstConverter_UnknownNode(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{
		Type:    "somethingNew",
		Content: []portabledoc.Node{paragraphNode(textNode("inner"))},
	}
	got := c.ConvertNode(node)
	if !strings.Contains(got, "inner") {
		t.Errorf("unknown node should render children, got %q", got)
	}
}

func TestTypstConverter_UnknownNodeEmpty(t *testing.T) {
	c := newConverter(nil, nil)
	node := portabledoc.Node{Type: "somethingNew"}
	got := c.ConvertNode(node)
	if got != "" {
		t.Errorf("expected empty, got %q", got)
	}
}

// --- Builder ---

func TestTypstBuilder_Build(t *testing.T) {
	doc := &portabledoc.Document{
		Meta: portabledoc.Meta{
			Title:    "Test Doc",
			Language: "en",
		},
		PageConfig: portabledoc.PageConfig{
			FormatID: portabledoc.PageFormatA4,
			Width:    794,
			Height:   1123,
			Margins: portabledoc.Margins{
				Top: 72, Bottom: 72, Left: 72, Right: 72,
			},
			ShowPageNumbers: true,
		},
		Content: &portabledoc.ProseMirrorDoc{
			Type: "doc",
			Content: []portabledoc.Node{
				paragraphNode(textNode("Hello world")),
			},
		},
	}

	builder := NewTypstBuilder(nil, nil)
	got := builder.Build(doc)

	checks := []string{
		`#set page(`,
		`paper: "a4"`,
		`numbering: "1"`,
		`#set text(`,
		`size: 12pt`,
		`Hello world`,
		`heading.where(level: 1)`,
	}
	for _, check := range checks {
		if !strings.Contains(got, check) {
			t.Errorf("expected output to contain %q, got:\n%s", check, got)
		}
	}
}

func TestTypstBuilder_CustomPageSize(t *testing.T) {
	doc := &portabledoc.Document{
		Meta: portabledoc.Meta{Title: "Custom", Language: "en"},
		PageConfig: portabledoc.PageConfig{
			FormatID: portabledoc.PageFormatCustom,
			Width:    500,
			Height:   700,
			Margins:  portabledoc.Margins{Top: 48, Bottom: 48, Left: 48, Right: 48},
		},
		Content: &portabledoc.ProseMirrorDoc{Type: "doc", Content: []portabledoc.Node{}},
	}

	builder := NewTypstBuilder(nil, nil)
	got := builder.Build(doc)

	if strings.Contains(got, "paper:") {
		t.Errorf("custom size should not use paper:, got:\n%s", got)
	}
	if !strings.Contains(got, "width:") || !strings.Contains(got, "height:") {
		t.Errorf("expected explicit width/height, got:\n%s", got)
	}
}

func TestTypstBuilder_PageCount(t *testing.T) {
	doc := &portabledoc.Document{
		Meta:       portabledoc.Meta{Title: "Test", Language: "en"},
		PageConfig: portabledoc.PageConfig{FormatID: portabledoc.PageFormatA4, Width: 794, Height: 1123, Margins: portabledoc.Margins{}},
		Content: &portabledoc.ProseMirrorDoc{
			Type: "doc",
			Content: []portabledoc.Node{
				paragraphNode(textNode("Page 1")),
				{Type: portabledoc.NodeTypePageBreak},
				paragraphNode(textNode("Page 2")),
				{Type: portabledoc.NodeTypePageBreak},
				paragraphNode(textNode("Page 3")),
			},
		},
	}

	builder := NewTypstBuilder(nil, nil)
	builder.Build(doc)

	if builder.GetPageCount() != 3 {
		t.Errorf("expected 3 pages, got %d", builder.GetPageCount())
	}
}
