package entity

import "time"

// Folder represents a hierarchical container for organizing templates.
type Folder struct {
	ID          string     `json:"id"`
	WorkspaceID string     `json:"workspaceId"`
	ParentID    *string    `json:"parentId,omitempty"` // NULL for root folders
	Name        string     `json:"name"`
	Path        string     `json:"path"` // Materialized path for efficient hierarchical queries
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty"`
}

// NewFolder creates a new folder.
func NewFolder(workspaceID string, parentID *string, name string) *Folder {
	return &Folder{
		WorkspaceID: workspaceID,
		ParentID:    parentID,
		Name:        name,
		CreatedAt:   time.Now().UTC(),
	}
}

// IsRoot returns true if this is a root folder (no parent).
func (f *Folder) IsRoot() bool {
	return f.ParentID == nil
}

// Validate checks if the folder data is valid.
func (f *Folder) Validate() error {
	if f.WorkspaceID == "" {
		return ErrRequiredField
	}
	if f.Name == "" {
		return ErrRequiredField
	}
	if len(f.Name) > 255 {
		return ErrFieldTooLong
	}
	return nil
}

// FolderWithCounts represents a folder with item counts.
type FolderWithCounts struct {
	Folder
	ChildFolderCount int `json:"childFolderCount"`
	TemplateCount    int `json:"templateCount"`
}

// FolderTree represents a folder with its children for tree display.
type FolderTree struct {
	Folder
	Children []*FolderTree `json:"children,omitempty"`
}

// NewFolderTree creates a folder tree node.
func NewFolderTree(folder *Folder) *FolderTree {
	return &FolderTree{
		Folder:   *folder,
		Children: make([]*FolderTree, 0),
	}
}

// AddChild adds a child folder to the tree.
func (ft *FolderTree) AddChild(child *FolderTree) {
	ft.Children = append(ft.Children, child)
}

// BuildFolderTree builds a tree structure from a flat list of folders.
func BuildFolderTree(folders []*Folder) []*FolderTree {
	// Create a map of folder ID to tree node
	nodeMap := make(map[string]*FolderTree)
	for _, f := range folders {
		nodeMap[f.ID] = NewFolderTree(f)
	}

	// Build tree structure
	var roots []*FolderTree
	for _, f := range folders {
		node := nodeMap[f.ID]
		if f.ParentID == nil {
			roots = append(roots, node)
		} else if parent, ok := nodeMap[*f.ParentID]; ok {
			parent.AddChild(node)
		}
	}

	return roots
}
