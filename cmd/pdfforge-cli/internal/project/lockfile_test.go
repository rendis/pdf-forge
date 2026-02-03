package project

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewLockFile(t *testing.T) {
	lock := NewLockFile("1.0.0")

	if lock.Version != "1.0.0" {
		t.Errorf("expected version 1.0.0, got %s", lock.Version)
	}

	if lock.Files == nil {
		t.Error("expected Files map to be initialized")
	}

	if lock.GeneratedAt.IsZero() {
		t.Error("expected GeneratedAt to be set")
	}
}

func TestAddFile(t *testing.T) {
	lock := NewLockFile("1.0.0")
	content := []byte("test content")

	lock.AddFile("test.go", "1.0.0", content)

	record, exists := lock.Files["test.go"]
	if !exists {
		t.Fatal("expected file record to exist")
	}

	if record.TemplateVersion != "1.0.0" {
		t.Errorf("expected template version 1.0.0, got %s", record.TemplateVersion)
	}

	if !strings.HasPrefix(record.Hash, "sha256:") {
		t.Errorf("expected hash to start with sha256:, got %s", record.Hash)
	}

	// Same content should produce same hash
	lock.AddFile("test2.go", "1.0.0", content)
	if lock.Files["test.go"].Hash != lock.Files["test2.go"].Hash {
		t.Error("same content should produce same hash")
	}
}

func TestSaveAndLoad(t *testing.T) {
	dir := t.TempDir()

	// Create and save lock file
	lock := NewLockFile("1.0.0")
	lock.AddFile("main.go", "1.0.0", []byte("package main"))
	lock.AddFile("config.yaml", "1.0.0", []byte("key: value"))

	if err := lock.Save(dir); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Verify file exists
	lockPath := filepath.Join(dir, LockFileName)
	if _, err := os.Stat(lockPath); os.IsNotExist(err) {
		t.Fatal("lock file not created")
	}

	// Load and verify
	loaded, err := LoadLockFile(dir)
	if err != nil {
		t.Fatalf("LoadLockFile failed: %v", err)
	}

	if loaded.Version != "1.0.0" {
		t.Errorf("expected version 1.0.0, got %s", loaded.Version)
	}

	if len(loaded.Files) != 2 {
		t.Errorf("expected 2 files, got %d", len(loaded.Files))
	}

	if _, exists := loaded.Files["main.go"]; !exists {
		t.Error("expected main.go in files")
	}

	if _, exists := loaded.Files["config.yaml"]; !exists {
		t.Error("expected config.yaml in files")
	}
}

func TestLoadLockFile_NotExists(t *testing.T) {
	dir := t.TempDir()

	_, err := LoadLockFile(dir)
	if err == nil {
		t.Error("expected error for non-existent lock file")
	}
}

func TestCheckFile(t *testing.T) {
	dir := t.TempDir()

	// Create a file
	content := []byte("original content")
	filePath := filepath.Join(dir, "test.go")
	if err := os.WriteFile(filePath, content, 0o644); err != nil {
		t.Fatal(err)
	}

	// Create lock file with the file tracked
	lock := NewLockFile("1.0.0")
	lock.AddFile("test.go", "1.0.0", content)

	// Test unchanged
	status := lock.CheckFile(dir, "test.go")
	if status != FileStatusUnchanged {
		t.Errorf("expected unchanged, got %v", status)
	}

	// Modify file
	if err := os.WriteFile(filePath, []byte("modified content"), 0o644); err != nil {
		t.Fatal(err)
	}

	status = lock.CheckFile(dir, "test.go")
	if status != FileStatusModified {
		t.Errorf("expected modified, got %v", status)
	}

	// Delete file
	if err := os.Remove(filePath); err != nil {
		t.Fatal(err)
	}

	status = lock.CheckFile(dir, "test.go")
	if status != FileStatusDeleted {
		t.Errorf("expected deleted, got %v", status)
	}

	// Check unknown file (not in lock)
	status = lock.CheckFile(dir, "unknown.go")
	if status != FileStatusUnknown {
		t.Errorf("expected unknown, got %v", status)
	}

	// Check new file (on disk but not in lock)
	newFilePath := filepath.Join(dir, "new.go")
	if err := os.WriteFile(newFilePath, []byte("new file"), 0o644); err != nil {
		t.Fatal(err)
	}

	status = lock.CheckFile(dir, "new.go")
	if status != FileStatusNew {
		t.Errorf("expected new, got %v", status)
	}
}

func TestCheckAllFiles(t *testing.T) {
	dir := t.TempDir()

	// Create files
	files := map[string][]byte{
		"unchanged.go": []byte("unchanged"),
		"modified.go":  []byte("original"),
		"deleted.go":   []byte("will delete"),
	}

	for name, content := range files {
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, content, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	// Create lock file
	lock := NewLockFile("1.0.0")
	for name, content := range files {
		lock.AddFile(name, "1.0.0", content)
	}

	// Modify one file
	if err := os.WriteFile(filepath.Join(dir, "modified.go"), []byte("changed"), 0o644); err != nil {
		t.Fatal(err)
	}

	// Delete one file
	if err := os.Remove(filepath.Join(dir, "deleted.go")); err != nil {
		t.Fatal(err)
	}

	// Check all files
	statusMap := lock.CheckAllFiles(dir)

	if statusMap["unchanged.go"] != FileStatusUnchanged {
		t.Errorf("expected unchanged.go to be unchanged, got %v", statusMap["unchanged.go"])
	}

	if statusMap["modified.go"] != FileStatusModified {
		t.Errorf("expected modified.go to be modified, got %v", statusMap["modified.go"])
	}

	if statusMap["deleted.go"] != FileStatusDeleted {
		t.Errorf("expected deleted.go to be deleted, got %v", statusMap["deleted.go"])
	}
}

func TestGetModifiedFiles(t *testing.T) {
	dir := t.TempDir()

	// Create files
	unchanged := filepath.Join(dir, "unchanged.go")
	modified := filepath.Join(dir, "modified.go")

	if err := os.WriteFile(unchanged, []byte("unchanged"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(modified, []byte("original"), 0o644); err != nil {
		t.Fatal(err)
	}

	// Create lock file
	lock := NewLockFile("1.0.0")
	lock.AddFile("unchanged.go", "1.0.0", []byte("unchanged"))
	lock.AddFile("modified.go", "1.0.0", []byte("original"))

	// Modify one file
	if err := os.WriteFile(modified, []byte("changed"), 0o644); err != nil {
		t.Fatal(err)
	}

	modifiedFiles := lock.GetModifiedFiles(dir)

	if len(modifiedFiles) != 1 {
		t.Fatalf("expected 1 modified file, got %d", len(modifiedFiles))
	}

	if modifiedFiles[0] != "modified.go" {
		t.Errorf("expected modified.go, got %s", modifiedFiles[0])
	}
}

func TestGetUnchangedFiles(t *testing.T) {
	dir := t.TempDir()

	// Create files
	unchanged := filepath.Join(dir, "unchanged.go")
	modified := filepath.Join(dir, "modified.go")

	if err := os.WriteFile(unchanged, []byte("unchanged"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(modified, []byte("original"), 0o644); err != nil {
		t.Fatal(err)
	}

	// Create lock file
	lock := NewLockFile("1.0.0")
	lock.AddFile("unchanged.go", "1.0.0", []byte("unchanged"))
	lock.AddFile("modified.go", "1.0.0", []byte("original"))

	// Modify one file
	if err := os.WriteFile(modified, []byte("changed"), 0o644); err != nil {
		t.Fatal(err)
	}

	unchangedFiles := lock.GetUnchangedFiles(dir)

	if len(unchangedFiles) != 1 {
		t.Fatalf("expected 1 unchanged file, got %d", len(unchangedFiles))
	}

	if unchangedFiles[0] != "unchanged.go" {
		t.Errorf("expected unchanged.go, got %s", unchangedFiles[0])
	}
}

func TestFileStatus_String(t *testing.T) {
	tests := []struct {
		status   FileStatus
		expected string
	}{
		{FileStatusUnknown, "unknown"},
		{FileStatusUnchanged, "unchanged"},
		{FileStatusModified, "modified"},
		{FileStatusDeleted, "deleted"},
		{FileStatusNew, "new"},
	}

	for _, tc := range tests {
		if tc.status.String() != tc.expected {
			t.Errorf("expected %s, got %s", tc.expected, tc.status.String())
		}
	}
}

func TestHashFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.txt")

	content := []byte("test content for hashing")
	if err := os.WriteFile(path, content, 0o644); err != nil {
		t.Fatal(err)
	}

	hash, err := HashFile(path)
	if err != nil {
		t.Fatalf("HashFile failed: %v", err)
	}

	if !strings.HasPrefix(hash, "sha256:") {
		t.Errorf("expected sha256 prefix, got %s", hash)
	}

	// Verify consistent hashing
	hash2, _ := HashFile(path)
	if hash != hash2 {
		t.Error("same file should produce same hash")
	}

	// Different content should produce different hash
	path2 := filepath.Join(dir, "test2.txt")
	if err := os.WriteFile(path2, []byte("different content"), 0o644); err != nil {
		t.Fatal(err)
	}

	hash3, _ := HashFile(path2)
	if hash == hash3 {
		t.Error("different content should produce different hash")
	}
}

func TestHashFile_NotExists(t *testing.T) {
	_, err := HashFile("/nonexistent/file.txt")
	if err == nil {
		t.Error("expected error for non-existent file")
	}
}

func TestAddFileFromDisk(t *testing.T) {
	dir := t.TempDir()

	// Create a file
	content := []byte("file content")
	filePath := filepath.Join(dir, "subdir", "test.go")
	if err := os.MkdirAll(filepath.Dir(filePath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filePath, content, 0o644); err != nil {
		t.Fatal(err)
	}

	// Add from disk
	lock := NewLockFile("1.0.0")
	if err := lock.AddFileFromDisk(dir, "subdir/test.go", "1.0.0"); err != nil {
		t.Fatalf("AddFileFromDisk failed: %v", err)
	}

	// Verify
	record, exists := lock.Files["subdir/test.go"]
	if !exists {
		t.Fatal("expected file record to exist")
	}

	if !strings.HasPrefix(record.Hash, "sha256:") {
		t.Errorf("expected sha256 hash, got %s", record.Hash)
	}
}

func TestAddFileFromDisk_NotExists(t *testing.T) {
	dir := t.TempDir()
	lock := NewLockFile("1.0.0")

	err := lock.AddFileFromDisk(dir, "nonexistent.go", "1.0.0")
	if err == nil {
		t.Error("expected error for non-existent file")
	}
}
