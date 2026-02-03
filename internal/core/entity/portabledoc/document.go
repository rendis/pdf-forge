// Package portabledoc defines types for the Portable Document Format (PDF-JSON).
// This format is used to export, import, and persist contract editor documents.
package portabledoc

// CurrentVersion is the latest supported format version.
const CurrentVersion = "1.1.0"

// Document represents the complete portable document format.
type Document struct {
	Version     string          `json:"version"`
	Meta        Meta            `json:"meta"`
	PageConfig  PageConfig      `json:"pageConfig"`
	VariableIDs []string        `json:"variableIds"`
	Content     *ProseMirrorDoc `json:"content"`
	ExportInfo  ExportInfo      `json:"exportInfo"`
}

// ExportInfo contains export metadata.
type ExportInfo struct {
	ExportedAt string  `json:"exportedAt"`
	ExportedBy *string `json:"exportedBy,omitempty"`
	SourceApp  string  `json:"sourceApp"`
	Checksum   *string `json:"checksum,omitempty"`
}
