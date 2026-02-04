package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/charmbracelet/lipgloss"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/project"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/templates"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/tui"
	"github.com/spf13/cobra"
)

var (
	// Version is set at build time via -ldflags
	Version = "0.2.0"

	// Styles (exported for use in other packages)
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("99"))

	successStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("46"))

	errorStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("196"))

	warningStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("214"))

	subtleStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("241"))
)

var rootCmd = &cobra.Command{
	Use:   "pdfforge-cli",
	Short: "PDF Forge project toolkit",
	Long: titleStyle.Render("pdfforge-cli") + ` — PDF Forge Command Center

Create, manage, and maintain pdf-forge projects with ease.`,
	SilenceUsage:  true,
	SilenceErrors: true,
	RunE:          runCommandCenter,
}

// Execute runs the root command
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, errorStyle.Render("Error: ")+err.Error())
		os.Exit(1)
	}
}

func init() {
	// Disable completion command
	rootCmd.CompletionOptions.DisableDefaultCmd = true
}

// runCommandCenter shows the interactive menu when no subcommand is provided
func runCommandCenter(cmd *cobra.Command, args []string) error {
	for {
		choice, err := tui.ShowMainMenu()
		if err != nil {
			return err
		}

		switch choice {
		case tui.MenuInstallUpdate:
			if err := runInstallUpdate(); err != nil {
				printError(err.Error())
			}
		case tui.MenuDoctor:
			runDoctor(cmd, args)
		case tui.MenuMigrate:
			if err := runMigrate(cmd, args); err != nil {
				printError(err.Error())
			}
		case tui.MenuExit:
			return nil
		}
	}
}

// runInstallUpdate handles the install/update flow
func runInstallUpdate() error {
	// Detect project status
	projectInfo := project.DetectProject(".")
	status, currentVersion := convertProjectStatus(projectInfo)

	choice, err := tui.ShowInstallMenu(status, currentVersion, Version)
	if err != nil {
		return err
	}

	switch choice {
	case "create":
		// Create in current directory
		return runInitInDir(".")
	case "subdir":
		// Ask for directory name
		name, err := tui.InputText("Project name", "Name of the directory to create", "my-pdf-app")
		if err != nil {
			return err
		}
		if name == "" {
			return nil
		}
		return runInitCommand(name)
	case "update":
		return runProjectUpdate(projectInfo)
	case "reinstall":
		confirmed, err := tui.Confirm("Reinstall project?", "This will regenerate project files. Modified files will be backed up.")
		if err != nil {
			return err
		}
		if confirmed {
			return runProjectUpdate(projectInfo)
		}
	case "back", "uptodate", "skip":
		return nil
	}

	return nil
}

// convertProjectStatus converts project.ProjectInfo to tui.ProjectStatus
func convertProjectStatus(info *project.ProjectInfo) (tui.ProjectStatus, string) {
	if !info.IsProject {
		return tui.ProjectStatusNew, ""
	}

	if info.NeedsUpdate(Version) {
		return tui.ProjectStatusOutdated, info.CurrentVersion
	}

	return tui.ProjectStatusExisting, info.CurrentVersion
}

// runInitInDir initializes a project in the specified directory
func runInitInDir(dir string) error {
	// TODO: Implement in-place initialization
	printWarning("In-place initialization not yet implemented. Use: pdfforge-cli init <name>")
	return nil
}

// runInitCommand runs the init command with the given name
func runInitCommand(name string) error {
	initCmd.SetArgs([]string{name, "-y"})
	return initCmd.Execute()
}

// runProjectUpdate updates an existing project with conflict detection
func runProjectUpdate(info *project.ProjectInfo) error {
	fmt.Println(titleStyle.Render("Updating project..."))
	fmt.Println()

	// Show current status
	if info.HasLockFile {
		fmt.Printf("%s Current version: %s\n", subtleStyle.Render("→"), info.CurrentVersion)
		fmt.Printf("%s Target version: %s\n", subtleStyle.Render("→"), Version)
	} else {
		fmt.Printf("%s No lock file found - will create one\n", warningStyle.Render("!"))
	}

	// Analyze files
	var fileStatuses []tui.FileStatusDisplay

	if info.HasLockFile && info.LockFile != nil {
		statusMap := info.LockFile.CheckAllFiles(".")
		for path, status := range statusMap {
			var action string
			switch status {
			case project.FileStatusModified:
				action = "needs decision"
			case project.FileStatusUnchanged:
				action = "will update"
			default:
				action = "update"
			}
			fileStatuses = append(fileStatuses, tui.FileStatusDisplay{
				Path:   path,
				Status: status,
				Action: action,
			})
		}

		if len(fileStatuses) > 0 {
			tui.ShowFileStatusTable(fileStatuses)
		}
	}

	// Handle modified files
	modifiedFiles := info.ModifiedFiles
	var opts project.UpdateOptions

	if len(modifiedFiles) > 0 {
		resolution, err := tui.ShowConflictResolution(len(modifiedFiles))
		if err != nil {
			return err
		}

		switch resolution {
		case tui.ResolutionSkip:
			opts.SkipModified = true
		case tui.ResolutionBackup:
			opts.BackupModified = true
		case tui.ResolutionOverwrite:
			opts.ForceOverwrite = true
		case tui.ResolutionView:
			// Handle per-file decision
			filesToUpdate := make(map[string]bool)
			for _, f := range info.GeneratedFiles {
				filesToUpdate[f] = true // Include all by default
			}

			for _, modFile := range modifiedFiles {
				// Read current content
				currentContent, err := os.ReadFile(modFile)
				if err != nil {
					continue
				}

				// Generate new content
				// Find the template name for this file
				tmplName := getTemplateNameForFile(modFile)
				if tmplName == "" {
					continue
				}

				newContent, err := renderTemplateForUpdate(tmplName)
				if err != nil {
					continue
				}

				diff := project.GetFileDiff(currentContent, newContent)
				resolution, err := tui.ShowPerFileResolution(modFile, diff)
				if err != nil {
					return err
				}

				if resolution == tui.ResolutionSkip {
					delete(filesToUpdate, modFile)
				}
			}

			opts.FilesToUpdate = filesToUpdate
			opts.BackupModified = true
		}
	}

	// Get template data
	moduleName := filepath.Base(".")
	if info.HasLockFile && info.LockFile != nil {
		// Try to extract module name from go.mod
		if content, err := os.ReadFile("go.mod"); err == nil {
			lines := string(content)
			if idx := findModuleLine(lines); idx != "" {
				moduleName = idx
			}
		}
	}

	data := templates.Data{
		ProjectName: filepath.Base("."),
		ModuleName:  moduleName,
		GoVersion:   "1.25.1",
		ForgeRoot:   findForgeRoot(),
	}

	// Run updater
	updater := project.NewUpdater(".", data, Version, opts)
	result, err := updater.Update()
	if err != nil {
		return err
	}

	// Show summary
	tui.ShowUpdateSummary(
		result.FilesUpdated,
		result.FilesSkipped,
		result.FilesBackedUp,
		result.FilesCreated,
		result.Errors,
	)

	return nil
}

// getTemplateNameForFile maps a file path to its template name
func getTemplateNameForFile(path string) string {
	mapping := map[string]string{
		"main.go":                                "main.go.tmpl",
		"go.mod":                                 "go.mod.tmpl",
		"config/app.yaml":                        "app.yaml.tmpl",
		"config/injectors.i18n.yaml":             "i18n.yaml.tmpl",
		"extensions/init.go":                     "init.go.tmpl",
		"extensions/mapper.go":                   "mapper.go.tmpl",
		"extensions/middleware.go":               "middleware.go.tmpl",
		"extensions/injectors/example_value.go":  "example_value.go.tmpl",
		"extensions/injectors/example_number.go": "example_number.go.tmpl",
		"extensions/injectors/example_bool.go":   "example_bool.go.tmpl",
		"extensions/injectors/example_time.go":   "example_time.go.tmpl",
		"extensions/injectors/example_image.go":  "example_image.go.tmpl",
		"extensions/injectors/example_table.go":  "example_table.go.tmpl",
		"extensions/injectors/example_list.go":   "example_list.go.tmpl",
		"docker-compose.yaml":                    "docker-compose.yaml.tmpl",
		"Dockerfile":                             "Dockerfile.tmpl",
		"Makefile":                               "Makefile.tmpl",
		".env.example":                           "env.tmpl",
	}
	return mapping[path]
}

// renderTemplateForUpdate renders a template with current project data
func renderTemplateForUpdate(tmplName string) ([]byte, error) {
	moduleName := "."
	if content, err := os.ReadFile("go.mod"); err == nil {
		if idx := findModuleLine(string(content)); idx != "" {
			moduleName = idx
		}
	}

	data := templates.Data{
		ProjectName: filepath.Base("."),
		ModuleName:  moduleName,
		GoVersion:   "1.25.1",
		ForgeRoot:   findForgeRoot(),
	}

	return renderTemplate(tmplName, data)
}

// findModuleLine extracts the module name from go.mod content
func findModuleLine(content string) string {
	for _, line := range splitLines(content) {
		if len(line) > 7 && line[:7] == "module " {
			return line[7:]
		}
	}
	return ""
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}

// Helper functions for formatted output

func printSuccess(msg string) {
	fmt.Println(successStyle.Render("✓ ") + msg)
}

func printError(msg string) {
	fmt.Fprintln(os.Stderr, errorStyle.Render("✗ ")+msg)
}

func printWarning(msg string) {
	fmt.Println(warningStyle.Render("! ") + msg)
}

func printInfo(msg string) {
	fmt.Println(subtleStyle.Render("→ ") + msg)
}
