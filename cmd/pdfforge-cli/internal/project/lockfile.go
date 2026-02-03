package project

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"
)

const LockFileName = ".pdfforge.lock"

// LockFile represents the .pdfforge.lock file structure
type LockFile struct {
	Version     string                `yaml:"version"`
	GeneratedAt time.Time             `yaml:"generated_at"`
	Files       map[string]FileRecord `yaml:"files"`
}

// FileRecord tracks a generated file
type FileRecord struct {
	Hash            string `yaml:"hash"`
	TemplateVersion string `yaml:"template_version"`
}

// NewLockFile creates a new lock file
func NewLockFile(version string) *LockFile {
	return &LockFile{
		Version:     version,
		GeneratedAt: time.Now(),
		Files:       make(map[string]FileRecord),
	}
}

// LoadLockFile loads a lock file from the given directory
func LoadLockFile(dir string) (*LockFile, error) {
	path := filepath.Join(dir, LockFileName)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var lock LockFile
	if err := yaml.Unmarshal(data, &lock); err != nil {
		return nil, fmt.Errorf("invalid lock file: %w", err)
	}

	if lock.Files == nil {
		lock.Files = make(map[string]FileRecord)
	}

	return &lock, nil
}

// Save writes the lock file to the given directory
func (l *LockFile) Save(dir string) error {
	l.GeneratedAt = time.Now()

	data, err := yaml.Marshal(l)
	if err != nil {
		return err
	}

	path := filepath.Join(dir, LockFileName)
	return os.WriteFile(path, data, 0o644)
}

// AddFile adds a file record to the lock file
func (l *LockFile) AddFile(relativePath, templateVersion string, content []byte) {
	l.Files[relativePath] = FileRecord{
		Hash:            hashContent(content),
		TemplateVersion: templateVersion,
	}
}

// AddFileFromDisk adds a file record by reading from disk
func (l *LockFile) AddFileFromDisk(baseDir, relativePath, templateVersion string) error {
	fullPath := filepath.Join(baseDir, relativePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return err
	}
	l.AddFile(relativePath, templateVersion, content)
	return nil
}

// GetFileStatus returns the status of a file compared to the lock
type FileStatus int

const (
	FileStatusUnknown    FileStatus = iota // Not in lock file
	FileStatusUnchanged                    // Matches lock file hash
	FileStatusModified                     // Different from lock file hash
	FileStatusDeleted                      // In lock but not on disk
	FileStatusNew                          // On disk but not in lock
)

func (s FileStatus) String() string {
	switch s {
	case FileStatusUnknown:
		return "unknown"
	case FileStatusUnchanged:
		return "unchanged"
	case FileStatusModified:
		return "modified"
	case FileStatusDeleted:
		return "deleted"
	case FileStatusNew:
		return "new"
	default:
		return "unknown"
	}
}

// CheckFile checks if a file has been modified since generation
func (l *LockFile) CheckFile(baseDir, relativePath string) FileStatus {
	record, exists := l.Files[relativePath]
	if !exists {
		// Check if file exists on disk
		fullPath := filepath.Join(baseDir, relativePath)
		if _, err := os.Stat(fullPath); err == nil {
			return FileStatusNew
		}
		return FileStatusUnknown
	}

	fullPath := filepath.Join(baseDir, relativePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return FileStatusDeleted
		}
		return FileStatusUnknown
	}

	currentHash := hashContent(content)
	if currentHash == record.Hash {
		return FileStatusUnchanged
	}

	return FileStatusModified
}

// CheckAllFiles checks all files in the lock against disk
func (l *LockFile) CheckAllFiles(baseDir string) map[string]FileStatus {
	status := make(map[string]FileStatus)
	for path := range l.Files {
		status[path] = l.CheckFile(baseDir, path)
	}
	return status
}

// GetModifiedFiles returns a list of files that have been modified
func (l *LockFile) GetModifiedFiles(baseDir string) []string {
	var modified []string
	for path := range l.Files {
		if l.CheckFile(baseDir, path) == FileStatusModified {
			modified = append(modified, path)
		}
	}
	return modified
}

// GetUnchangedFiles returns a list of files that are unchanged
func (l *LockFile) GetUnchangedFiles(baseDir string) []string {
	var unchanged []string
	for path := range l.Files {
		if l.CheckFile(baseDir, path) == FileStatusUnchanged {
			unchanged = append(unchanged, path)
		}
	}
	return unchanged
}

// hashContent returns SHA256 hash of content
func hashContent(content []byte) string {
	h := sha256.New()
	h.Write(content)
	return "sha256:" + hex.EncodeToString(h.Sum(nil))
}

// HashFile returns SHA256 hash of a file
func HashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}

	return "sha256:" + hex.EncodeToString(h.Sum(nil)), nil
}
