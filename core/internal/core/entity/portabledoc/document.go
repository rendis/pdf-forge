// Package portabledoc defines types for the Portable Document Format (PDF-JSON).
// This format is used to export, import, and persist contract editor documents.
package portabledoc

// CurrentVersion is the latest supported format version.
const CurrentVersion = "2.2.0"

// Document represents the complete portable document format.
type Document struct {
	Version     string          `json:"version"`
	Meta        Meta            `json:"meta"`
	PageConfig  PageConfig      `json:"pageConfig"`
	Header      *DocumentHeader `json:"header,omitempty"`
	Footer      *DocumentFooter `json:"footer,omitempty"`
	VariableIDs []string        `json:"variableIds"`
	Content     *ProseMirrorDoc `json:"content"`
	ExportInfo  ExportInfo      `json:"exportInfo"`
}

// Surface layout constants (shared by header and footer).
const (
	SurfaceLayoutImageLeft   = "image-left"
	SurfaceLayoutImageRight  = "image-right"
	SurfaceLayoutImageCenter = "image-center"
)

// ValidSurfaceLayouts contains allowed surface layout values.
var ValidSurfaceLayouts = Set[string]{
	SurfaceLayoutImageLeft:   {},
	SurfaceLayoutImageRight:  {},
	SurfaceLayoutImageCenter: {},
}

// DocumentSurface is the common interface for header and footer surfaces.
type DocumentSurface interface {
	IsEnabled() bool
	SurfaceLayout() string
	HasImage() bool
	SurfaceImageURL() string
	SurfaceImageInjectableID() string
	SurfaceImageWidth() float64
	SurfaceImageHeight() float64
	ContentNodes() []Node
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

// HeaderEnabled returns whether the document has an active header.
func (d *Document) HeaderEnabled() bool {
	return d.Header != nil && d.Header.Enabled
}

// Interface implementation for DocumentHeader.
func (h *DocumentHeader) IsEnabled() bool               { return h.Enabled }
func (h *DocumentHeader) SurfaceLayout() string          { return h.Layout }
func (h *DocumentHeader) HasImage() bool                 { return h.ImageURL != "" || h.ImageInjectableID != "" }
func (h *DocumentHeader) SurfaceImageURL() string        { return h.ImageURL }
func (h *DocumentHeader) SurfaceImageInjectableID() string { return h.ImageInjectableID }
func (h *DocumentHeader) SurfaceImageWidth() float64     { return h.ImageWidth }
func (h *DocumentHeader) SurfaceImageHeight() float64    { return h.ImageHeight }

// ContentNodes returns the header's ProseMirror content nodes, or nil.
func (h *DocumentHeader) ContentNodes() []Node {
	if h.Content == nil {
		return nil
	}
	return h.Content.Content
}

// DocumentFooter contains the document footer configuration.
// The footer is rendered only on the last page.
type DocumentFooter struct {
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

// FooterEnabled returns whether the document has an active footer.
func (d *Document) FooterEnabled() bool {
	return d.Footer != nil && d.Footer.Enabled
}

// Interface implementation for DocumentFooter.
func (f *DocumentFooter) IsEnabled() bool               { return f.Enabled }
func (f *DocumentFooter) SurfaceLayout() string          { return f.Layout }
func (f *DocumentFooter) HasImage() bool                 { return f.ImageURL != "" || f.ImageInjectableID != "" }
func (f *DocumentFooter) SurfaceImageURL() string        { return f.ImageURL }
func (f *DocumentFooter) SurfaceImageInjectableID() string { return f.ImageInjectableID }
func (f *DocumentFooter) SurfaceImageWidth() float64     { return f.ImageWidth }
func (f *DocumentFooter) SurfaceImageHeight() float64    { return f.ImageHeight }

// ContentNodes returns the footer's ProseMirror content nodes, or nil.
func (f *DocumentFooter) ContentNodes() []Node {
	if f.Content == nil {
		return nil
	}
	return f.Content.Content
}

// HeaderImageInjectableID returns the header image injectable ID, or "".
func (d *Document) HeaderImageInjectableID() string {
	if d.Header != nil {
		return d.Header.ImageInjectableID
	}
	return ""
}

// FooterImageInjectableID returns the footer image injectable ID, or "".
func (d *Document) FooterImageInjectableID() string {
	if d.Footer != nil {
		return d.Footer.ImageInjectableID
	}
	return ""
}

// ExportInfo contains export metadata.
type ExportInfo struct {
	ExportedAt string  `json:"exportedAt"`
	ExportedBy *string `json:"exportedBy,omitempty"`
	SourceApp  string  `json:"sourceApp"`
	Checksum   *string `json:"checksum,omitempty"`
}
