// Package portabledoc defines types for the Portable Document Format (PDF-JSON).
// This format is used to export, import, and persist contract editor documents.
package portabledoc

// CurrentVersion is the latest supported format version.
const CurrentVersion = "2.1.0"

// Document represents the complete portable document format.
type Document struct {
	Version     string          `json:"version"`
	Meta        Meta            `json:"meta"`
	PageConfig  PageConfig      `json:"pageConfig"`
	Header      *DocumentHeader `json:"header,omitempty"`
	VariableIDs []string        `json:"variableIds"`
	Content     *ProseMirrorDoc `json:"content"`
	ExportInfo  ExportInfo      `json:"exportInfo"`
}

// DocumentHeader contains the document header configuration.
// The header is rendered only on the first page.
type DocumentHeader struct {
	Enabled              bool            `json:"enabled"`
	Layout               string          `json:"layout"` // image-left | image-right | image-center
	ImageURL             string          `json:"imageUrl,omitempty"`
	ImageAlt             string          `json:"imageAlt,omitempty"`
	ImageInjectableID    string          `json:"imageInjectableId,omitempty"`
	ImageInjectableLabel string          `json:"imageInjectableLabel,omitempty"`
	ImageWidth           float64         `json:"imageWidth,omitempty"`
	ImageHeight          float64         `json:"imageHeight,omitempty"`
	Content              *ProseMirrorDoc `json:"content,omitempty"`
}

// Header layout constants.
const (
	HeaderLayoutImageLeft   = "image-left"
	HeaderLayoutImageRight  = "image-right"
	HeaderLayoutImageCenter = "image-center"
)

// ValidHeaderLayouts contains allowed header layout values.
var ValidHeaderLayouts = Set[string]{
	HeaderLayoutImageLeft:   {},
	HeaderLayoutImageRight:  {},
	HeaderLayoutImageCenter: {},
}

// HeaderEnabled returns whether the document has an active header.
func (d *Document) HeaderEnabled() bool {
	return d.Header != nil && d.Header.Enabled
}

// HasHeaderImage returns whether the header has a static or injectable image.
func (h *DocumentHeader) HasHeaderImage() bool {
	return h.ImageURL != "" || h.ImageInjectableID != ""
}

// ContentNodes returns the header's ProseMirror content nodes, or nil.
func (h *DocumentHeader) ContentNodes() []Node {
	if h.Content == nil {
		return nil
	}
	return h.Content.Content
}

// ExportInfo contains export metadata.
type ExportInfo struct {
	ExportedAt string  `json:"exportedAt"`
	ExportedBy *string `json:"exportedBy,omitempty"`
	SourceApp  string  `json:"sourceApp"`
	Checksum   *string `json:"checksum,omitempty"`
}
