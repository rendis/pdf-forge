package project

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectProject_WithLockFile(t *testing.T) {
	dir := t.TempDir()

	// Create a lock file
	lock := NewLockFile("1.0.0")
	lock.AddFile("main.go", "1.0.0", []byte("package main"))
	if err := lock.Save(dir); err != nil {
		t.Fatal(err)
	}

	// Create the tracked file
	mainPath := filepath.Join(dir, "main.go")
	if err := os.WriteFile(mainPath, []byte("package main"), 0o644); err != nil {
		t.Fatal(err)
	}

	info := DetectProject(dir)

	if !info.IsProject {
		t.Error("expected IsProject to be true")
	}

	if !info.HasLockFile {
		t.Error("expected HasLockFile to be true")
	}

	if info.CurrentVersion != "1.0.0" {
		t.Errorf("expected version 1.0.0, got %s", info.CurrentVersion)
	}

	if info.LockFile == nil {
		t.Error("expected LockFile to be set")
	}

	if len(info.GeneratedFiles) != 1 {
		t.Errorf("expected 1 generated file, got %d", len(info.GeneratedFiles))
	}
}

func TestDetectProject_WithMainGoImport(t *testing.T) {
	dir := t.TempDir()

	// Create main.go with pdf-forge import
	mainContent := `package main

import (
	"github.com/rendis/pdf-forge/sdk"
)

func main() {
	sdk.New()
}
`
	mainPath := filepath.Join(dir, "main.go")
	if err := os.WriteFile(mainPath, []byte(mainContent), 0o644); err != nil {
		t.Fatal(err)
	}

	info := DetectProject(dir)

	if !info.IsProject {
		t.Error("expected IsProject to be true")
	}

	if info.HasLockFile {
		t.Error("expected HasLockFile to be false")
	}

	if info.CurrentVersion != "unknown" {
		t.Errorf("expected version unknown, got %s", info.CurrentVersion)
	}
}

func TestDetectProject_WithGoMod(t *testing.T) {
	dir := t.TempDir()

	// Create go.mod with pdf-forge dependency
	goModContent := `module example.com/myproject

go 1.21

require github.com/rendis/pdf-forge v0.1.0
`
	goModPath := filepath.Join(dir, "go.mod")
	if err := os.WriteFile(goModPath, []byte(goModContent), 0o644); err != nil {
		t.Fatal(err)
	}

	info := DetectProject(dir)

	if !info.IsProject {
		t.Error("expected IsProject to be true")
	}

	if info.HasLockFile {
		t.Error("expected HasLockFile to be false")
	}

	if info.CurrentVersion != "unknown" {
		t.Errorf("expected version unknown, got %s", info.CurrentVersion)
	}
}

func TestDetectProject_NotAProject(t *testing.T) {
	dir := t.TempDir()

	// Create an unrelated main.go
	mainContent := `package main

import "fmt"

func main() {
	fmt.Println("Hello")
}
`
	mainPath := filepath.Join(dir, "main.go")
	if err := os.WriteFile(mainPath, []byte(mainContent), 0o644); err != nil {
		t.Fatal(err)
	}

	info := DetectProject(dir)

	if info.IsProject {
		t.Error("expected IsProject to be false")
	}
}

func TestDetectProject_EmptyDirectory(t *testing.T) {
	dir := t.TempDir()

	info := DetectProject(dir)

	if info.IsProject {
		t.Error("expected IsProject to be false")
	}

	if info.HasLockFile {
		t.Error("expected HasLockFile to be false")
	}
}

func TestDetectProject_ModifiedFiles(t *testing.T) {
	dir := t.TempDir()

	// Create lock file with tracked files
	lock := NewLockFile("1.0.0")
	lock.AddFile("main.go", "1.0.0", []byte("original"))
	lock.AddFile("config.yaml", "1.0.0", []byte("key: value"))
	if err := lock.Save(dir); err != nil {
		t.Fatal(err)
	}

	// Create files - one unchanged, one modified
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte("modified"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "config.yaml"), []byte("key: value"), 0o644); err != nil {
		t.Fatal(err)
	}

	info := DetectProject(dir)

	if !info.IsProject {
		t.Error("expected IsProject to be true")
	}

	if len(info.ModifiedFiles) != 1 {
		t.Errorf("expected 1 modified file, got %d: %v", len(info.ModifiedFiles), info.ModifiedFiles)
	}

	if len(info.ModifiedFiles) > 0 && info.ModifiedFiles[0] != "main.go" {
		t.Errorf("expected main.go to be modified, got %s", info.ModifiedFiles[0])
	}

	if len(info.UnchangedFiles) != 1 {
		t.Errorf("expected 1 unchanged file, got %d", len(info.UnchangedFiles))
	}
}

func TestProjectInfo_NeedsUpdate(t *testing.T) {
	tests := []struct {
		name           string
		info           ProjectInfo
		latestVersion  string
		expectedResult bool
	}{
		{
			name:           "not a project",
			info:           ProjectInfo{IsProject: false},
			latestVersion:  "2.0.0",
			expectedResult: false,
		},
		{
			name:           "unknown version",
			info:           ProjectInfo{IsProject: true, CurrentVersion: "unknown"},
			latestVersion:  "2.0.0",
			expectedResult: true,
		},
		{
			name:           "same version",
			info:           ProjectInfo{IsProject: true, CurrentVersion: "2.0.0"},
			latestVersion:  "2.0.0",
			expectedResult: false,
		},
		{
			name:           "outdated",
			info:           ProjectInfo{IsProject: true, CurrentVersion: "1.0.0"},
			latestVersion:  "2.0.0",
			expectedResult: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.info.NeedsUpdate(tc.latestVersion)
			if result != tc.expectedResult {
				t.Errorf("expected %v, got %v", tc.expectedResult, result)
			}
		})
	}
}

func TestProjectInfo_HasModifications(t *testing.T) {
	tests := []struct {
		name     string
		info     ProjectInfo
		expected bool
	}{
		{
			name:     "no modifications",
			info:     ProjectInfo{ModifiedFiles: nil},
			expected: false,
		},
		{
			name:     "empty slice",
			info:     ProjectInfo{ModifiedFiles: []string{}},
			expected: false,
		},
		{
			name:     "has modifications",
			info:     ProjectInfo{ModifiedFiles: []string{"main.go"}},
			expected: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.info.HasModifications()
			if result != tc.expected {
				t.Errorf("expected %v, got %v", tc.expected, result)
			}
		})
	}
}

func TestDetectGeneratedFiles(t *testing.T) {
	dir := t.TempDir()

	// Create some standard generated files
	files := []string{
		"main.go",
		"go.mod",
		"config/app.yaml",
		"extensions/init.go",
	}

	for _, f := range files {
		path := filepath.Join(dir, f)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte("content"), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	detected := detectGeneratedFiles(dir)

	if len(detected) != 4 {
		t.Errorf("expected 4 detected files, got %d: %v", len(detected), detected)
	}

	// Check that all expected files are detected
	expected := map[string]bool{
		"main.go":            true,
		"go.mod":             true,
		"config/app.yaml":    true,
		"extensions/init.go": true,
	}

	for _, f := range detected {
		if !expected[f] {
			t.Errorf("unexpected file detected: %s", f)
		}
	}
}
