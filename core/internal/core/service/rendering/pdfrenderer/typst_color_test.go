package pdfrenderer

import (
	"strings"
	"testing"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
)

func TestTypstColorExpr(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "hex long",
			input: "#18162E",
			want:  `rgb("#18162E")`,
		},
		{
			name:  "hex short",
			input: "#abc",
			want:  `rgb("#abc")`,
		},
		{
			name:  "css rgb",
			input: "rgb(24, 22, 46)",
			want:  "rgb(24, 22, 46)",
		},
		{
			name:  "css rgba with alpha",
			input: "rgba(24, 22, 46, 0.5)",
			want:  "rgb(24, 22, 46, 50%)",
		},
		{
			name:  "typst named color",
			input: "red",
			want:  "red",
		},
		{
			name:  "typst luma expression",
			input: "luma(200)",
			want:  "luma(200)",
		},
		{
			name:  "unknown keeps hex-safe fallback",
			input: "not-a-color",
			want:  `rgb("#000000")`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := typstColorExpr(tt.input)
			if got != tt.want {
				t.Fatalf("typstColorExpr(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestTypstConverter_TextStyleAcceptsCSSRGBColor(t *testing.T) {
	c := newConverter(nil, nil)
	node := markedTextNode("hello", mark(portabledoc.MarkTypeTextStyle, map[string]any{
		"fontFamily": "Arial, sans-serif",
		"color":      "rgb(24, 22, 46)",
	}))

	got := c.ConvertNode(node)

	if !strings.Contains(got, `fill: rgb(24, 22, 46)`) {
		t.Fatalf("expected CSS rgb color to be normalized, got %q", got)
	}
}

func TestTypstConverter_ListStyleAcceptsCSSRGBColor(t *testing.T) {
	c := newConverter(nil, nil)
	color := "rgb(24, 22, 46)"
	styles := &entity.ListStyles{TextColor: &color}

	parts := c.collectListStyleParts(styles)

	if len(parts) == 0 {
		t.Fatal("expected list style parts")
	}

	found := false
	for _, part := range parts {
		if strings.Contains(part, "fill:") {
			found = true
			if part != "fill: rgb(24, 22, 46)" {
				t.Fatalf("expected normalized list color, got %q", part)
			}
		}
	}

	if !found {
		t.Fatal("expected fill style part")
	}
}
