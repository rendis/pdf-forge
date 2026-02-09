package frontend

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// Assets returns the embedded frontend filesystem rooted at dist/.
// Returns nil, nil if dist/ contains only the placeholder (.gitkeep).
func Assets() (fs.FS, error) {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return nil, err
	}
	if !hasIndexHTML(sub) {
		return nil, nil
	}
	return sub, nil
}

// hasIndexHTML checks whether the filesystem contains an index.html file.
func hasIndexHTML(fsys fs.FS) bool {
	_, err := fs.Stat(fsys, "index.html")
	return err == nil
}
