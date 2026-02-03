package project

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/templates"
)

// UpdateResult represents the result of an update operation
type UpdateResult struct {
	FilesUpdated  []string
	FilesSkipped  []string
	FilesBackedUp []string
	FilesCreated  []string
	Errors        []error
}

// UpdateOptions configures how the update should behave
type UpdateOptions struct {
	BackupModified bool              // Backup modified files before overwriting
	SkipModified   bool              // Skip modified files entirely
	ForceOverwrite bool              // Overwrite everything without backup
	FilesToUpdate  map[string]bool   // If set, only update these files
}

// Updater handles project updates
type Updater struct {
	projectDir    string
	templateData  templates.Data
	version       string
	currentLock   *LockFile
	options       UpdateOptions
}

// NewUpdater creates a new updater for a project
func NewUpdater(projectDir string, data templates.Data, version string, opts UpdateOptions) *Updater {
	lock, _ := LoadLockFile(projectDir)
	return &Updater{
		projectDir:   projectDir,
		templateData: data,
		version:      version,
		currentLock:  lock,
		options:      opts,
	}
}

// Update performs the update operation
func (u *Updater) Update() (*UpdateResult, error) {
	result := &UpdateResult{}

	// Get list of template files to process
	templateFiles := getTemplateFiles()

	// Create new lock file
	newLock := NewLockFile(u.version)

	for _, tf := range templateFiles {
		// Check if we should process this file
		if u.options.FilesToUpdate != nil {
			if _, ok := u.options.FilesToUpdate[tf.OutputPath]; !ok {
				continue
			}
		}

		// Check current file status
		status := FileStatusUnknown
		if u.currentLock != nil {
			status = u.currentLock.CheckFile(u.projectDir, tf.OutputPath)
		} else {
			// No lock file - check if file exists
			fullPath := filepath.Join(u.projectDir, tf.OutputPath)
			if _, err := os.Stat(fullPath); err == nil {
				status = FileStatusModified // Assume modified if no lock
			}
		}

		// Handle based on status and options
		switch status {
		case FileStatusModified:
			if u.options.SkipModified {
				result.FilesSkipped = append(result.FilesSkipped, tf.OutputPath)
				// Keep old hash in new lock
				if u.currentLock != nil {
					if record, ok := u.currentLock.Files[tf.OutputPath]; ok {
						newLock.Files[tf.OutputPath] = record
					}
				}
				continue
			}

			if u.options.BackupModified && !u.options.ForceOverwrite {
				if err := u.backupFile(tf.OutputPath); err != nil {
					result.Errors = append(result.Errors, fmt.Errorf("backup %s: %w", tf.OutputPath, err))
					continue
				}
				result.FilesBackedUp = append(result.FilesBackedUp, tf.OutputPath)
			}

		case FileStatusUnknown, FileStatusDeleted:
			result.FilesCreated = append(result.FilesCreated, tf.OutputPath)
		}

		// Generate and write file
		content, err := u.renderTemplate(tf.TemplateName)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Errorf("render %s: %w", tf.OutputPath, err))
			continue
		}

		if err := u.writeFile(tf.OutputPath, content); err != nil {
			result.Errors = append(result.Errors, fmt.Errorf("write %s: %w", tf.OutputPath, err))
			continue
		}

		// Add to new lock file
		newLock.AddFile(tf.OutputPath, u.version, content)
		result.FilesUpdated = append(result.FilesUpdated, tf.OutputPath)
	}

	// Save new lock file
	if err := newLock.Save(u.projectDir); err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("save lock file: %w", err))
	}

	return result, nil
}

// backupFile creates a backup of a file
func (u *Updater) backupFile(relativePath string) error {
	srcPath := filepath.Join(u.projectDir, relativePath)

	// Create backup directory
	backupDir := filepath.Join(u.projectDir, ".pdfforge-backup", time.Now().Format("2006-01-02_15-04-05"))
	backupPath := filepath.Join(backupDir, relativePath)

	if err := os.MkdirAll(filepath.Dir(backupPath), 0o755); err != nil {
		return err
	}

	// Copy file
	content, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}

	return os.WriteFile(backupPath, content, 0o644)
}

// writeFile writes content to a file, creating directories as needed
func (u *Updater) writeFile(relativePath string, content []byte) error {
	fullPath := filepath.Join(u.projectDir, relativePath)

	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, content, 0o644)
}

// renderTemplate renders a template with the current data
func (u *Updater) renderTemplate(tmplName string) ([]byte, error) {
	tmpl := templates.Templates.Lookup(tmplName)
	if tmpl == nil {
		return nil, fmt.Errorf("template %q not found", tmplName)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, u.templateData); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// TemplateFile maps a template to an output file
type TemplateFile struct {
	TemplateName string
	OutputPath   string
	Optional     bool // If true, don't fail if template is missing
}

// getTemplateFiles returns the list of template files to generate
func getTemplateFiles() []TemplateFile {
	return []TemplateFile{
		{TemplateName: "main.go.tmpl", OutputPath: "main.go"},
		{TemplateName: "go.mod.tmpl", OutputPath: "go.mod"},
		{TemplateName: "app.yaml.tmpl", OutputPath: "config/app.yaml"},
		{TemplateName: "i18n.yaml.tmpl", OutputPath: "config/injectors.i18n.yaml"},
		{TemplateName: "init.go.tmpl", OutputPath: "extensions/init.go"},
		{TemplateName: "mapper.go.tmpl", OutputPath: "extensions/mapper.go"},
		{TemplateName: "example_value.go.tmpl", OutputPath: "extensions/injectors/example_value.go", Optional: true},
		{TemplateName: "example_number.go.tmpl", OutputPath: "extensions/injectors/example_number.go", Optional: true},
		{TemplateName: "example_bool.go.tmpl", OutputPath: "extensions/injectors/example_bool.go", Optional: true},
		{TemplateName: "example_time.go.tmpl", OutputPath: "extensions/injectors/example_time.go", Optional: true},
		{TemplateName: "example_image.go.tmpl", OutputPath: "extensions/injectors/example_image.go", Optional: true},
		{TemplateName: "example_table.go.tmpl", OutputPath: "extensions/injectors/example_table.go", Optional: true},
		{TemplateName: "example_list.go.tmpl", OutputPath: "extensions/injectors/example_list.go", Optional: true},
		{TemplateName: "docker-compose.yaml.tmpl", OutputPath: "docker-compose.yaml", Optional: true},
		{TemplateName: "Dockerfile.tmpl", OutputPath: "Dockerfile", Optional: true},
		{TemplateName: "Makefile.tmpl", OutputPath: "Makefile", Optional: true},
		{TemplateName: "env.tmpl", OutputPath: ".env.example", Optional: true},
	}
}

// GetFileDiff returns a simple diff between old and new content
func GetFileDiff(oldContent, newContent []byte) string {
	oldLines := strings.Split(string(oldContent), "\n")
	newLines := strings.Split(string(newContent), "\n")

	var diff strings.Builder
	diff.WriteString("--- old\n+++ new\n")

	// Simple line-by-line comparison
	maxLines := len(oldLines)
	if len(newLines) > maxLines {
		maxLines = len(newLines)
	}

	for i := 0; i < maxLines; i++ {
		var oldLine, newLine string
		if i < len(oldLines) {
			oldLine = oldLines[i]
		}
		if i < len(newLines) {
			newLine = newLines[i]
		}

		if oldLine != newLine {
			if oldLine != "" {
				diff.WriteString(fmt.Sprintf("- %s\n", oldLine))
			}
			if newLine != "" {
				diff.WriteString(fmt.Sprintf("+ %s\n", newLine))
			}
		}
	}

	return diff.String()
}
