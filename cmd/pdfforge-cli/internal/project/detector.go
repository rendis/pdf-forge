package project

import (
	"os"
	"path/filepath"
	"strings"
)

// ProjectInfo contains information about a detected project
type ProjectInfo struct {
	Path            string
	IsProject       bool
	HasLockFile     bool
	CurrentVersion  string
	LockFile        *LockFile
	GeneratedFiles  []string
	ModifiedFiles   []string
	UnchangedFiles  []string
}

// DetectProject analyzes a directory to determine if it's a pdf-forge project
func DetectProject(dir string) *ProjectInfo {
	info := &ProjectInfo{
		Path: dir,
	}

	// Check for lock file first (most reliable)
	lock, err := LoadLockFile(dir)
	if err == nil {
		info.IsProject = true
		info.HasLockFile = true
		info.CurrentVersion = lock.Version
		info.LockFile = lock

		// Analyze files
		for path := range lock.Files {
			info.GeneratedFiles = append(info.GeneratedFiles, path)
		}
		info.ModifiedFiles = lock.GetModifiedFiles(dir)
		info.UnchangedFiles = lock.GetUnchangedFiles(dir)

		return info
	}

	// Fallback: check for main.go with pdf-forge import
	mainGoPath := filepath.Join(dir, "main.go")
	if content, err := os.ReadFile(mainGoPath); err == nil {
		if strings.Contains(string(content), "github.com/rendis/pdf-forge") {
			info.IsProject = true
			info.CurrentVersion = "unknown"

			// Try to detect generated files by checking for standard structure
			info.GeneratedFiles = detectGeneratedFiles(dir)
			return info
		}
	}

	// Check for go.mod with pdf-forge dependency
	goModPath := filepath.Join(dir, "go.mod")
	if content, err := os.ReadFile(goModPath); err == nil {
		if strings.Contains(string(content), "github.com/rendis/pdf-forge") {
			info.IsProject = true
			info.CurrentVersion = "unknown"
			info.GeneratedFiles = detectGeneratedFiles(dir)
			return info
		}
	}

	return info
}

// detectGeneratedFiles tries to find files that were likely generated
func detectGeneratedFiles(dir string) []string {
	var files []string

	// Standard generated files
	standardFiles := []string{
		"main.go",
		"go.mod",
		"config/app.yaml",
		"config/injectors.i18n.yaml",
		"extensions/init.go",
		"extensions/mapper.go",
		"extensions/injectors/example_value.go",
		"extensions/injectors/example_number.go",
		"extensions/injectors/example_bool.go",
		"extensions/injectors/example_time.go",
		"extensions/injectors/example_image.go",
		"extensions/injectors/example_table.go",
		"extensions/injectors/example_list.go",
		"docker-compose.yaml",
		"Dockerfile",
		"Makefile",
		".env.example",
	}

	for _, file := range standardFiles {
		path := filepath.Join(dir, file)
		if _, err := os.Stat(path); err == nil {
			files = append(files, file)
		}
	}

	return files
}

// NeedsUpdate checks if the project needs an update
func (p *ProjectInfo) NeedsUpdate(latestVersion string) bool {
	if !p.IsProject {
		return false
	}
	if p.CurrentVersion == "unknown" {
		return true
	}
	return p.CurrentVersion != latestVersion
}

// HasModifications checks if any generated files have been modified
func (p *ProjectInfo) HasModifications() bool {
	return len(p.ModifiedFiles) > 0
}
