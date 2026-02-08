package portabledoc

// ProseMirrorDoc represents the document content.
type ProseMirrorDoc struct {
	Type    string `json:"type"` // always "doc"
	Content []Node `json:"content"`
}

// Node represents a node in the document.
type Node struct {
	Type    string         `json:"type"`
	Attrs   map[string]any `json:"attrs,omitempty"`
	Content []Node         `json:"content,omitempty"`
	Marks   []Mark         `json:"marks,omitempty"`
	Text    *string        `json:"text,omitempty"`
}

// Mark represents a text mark.
type Mark struct {
	Type  string         `json:"type"`
	Attrs map[string]any `json:"attrs,omitempty"`
}

// Node type constants.
const (
	NodeTypeDoc         = "doc"
	NodeTypeParagraph   = "paragraph"
	NodeTypeHeading     = "heading"
	NodeTypeBlockquote  = "blockquote"
	NodeTypeCodeBlock   = "codeBlock"
	NodeTypeHR          = "horizontalRule"
	NodeTypeBulletList  = "bulletList"
	NodeTypeOrderedList = "orderedList"
	NodeTypeTaskList    = "taskList"
	NodeTypeListItem    = "listItem"
	NodeTypeTaskItem    = "taskItem"
	NodeTypeInjector    = "injector"
	NodeTypeConditional = "conditional"
	NodeTypePageBreak   = "pageBreak"
	NodeTypeImage       = "image"
	NodeTypeCustomImage = "customImage"
	NodeTypeText        = "text"
	// List types
	NodeTypeListInjector = "listInjector" // Dynamic list from system injector
	// Table types
	NodeTypeTableInjector = "tableInjector" // Dynamic table from system injector
	NodeTypeTable         = "table"         // Editable table (user-created)
	NodeTypeTableRow      = "tableRow"
	NodeTypeTableCell     = "tableCell"
	NodeTypeTableHeader   = "tableHeader"
)

// Mark type constants.
const (
	MarkTypeBold      = "bold"
	MarkTypeItalic    = "italic"
	MarkTypeStrike    = "strike"
	MarkTypeCode      = "code"
	MarkTypeUnderline = "underline"
	MarkTypeHighlight = "highlight"
	MarkTypeLink      = "link"
	MarkTypeTextStyle = "textStyle"
)
