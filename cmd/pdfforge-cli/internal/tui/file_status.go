package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/project"
)

// FileStatusDisplay represents how to display file status
type FileStatusDisplay struct {
	Path   string
	Status project.FileStatus
	Action string // What will happen to this file
}

// ShowFileStatusTable displays a table of file statuses
func ShowFileStatusTable(files []FileStatusDisplay) {
	// Calculate column widths
	maxPathLen := 4 // "FILE"
	for _, f := range files {
		if len(f.Path) > maxPathLen {
			maxPathLen = len(f.Path)
		}
	}
	if maxPathLen > 40 {
		maxPathLen = 40
	}

	// Header
	header := lipgloss.NewStyle().Bold(true)
	fmt.Println(header.Render(fmt.Sprintf("%-*s  %-12s  %s", maxPathLen, "FILE", "STATUS", "ACTION")))
	fmt.Println(strings.Repeat("─", maxPathLen+30))

	// Rows
	for _, f := range files {
		path := f.Path
		if len(path) > maxPathLen {
			path = "..." + path[len(path)-maxPathLen+3:]
		}

		var statusStyle lipgloss.Style
		var statusIcon string

		switch f.Status {
		case project.FileStatusUnchanged:
			statusStyle = SuccessStyle
			statusIcon = "✓"
		case project.FileStatusModified:
			statusStyle = WarningStyle
			statusIcon = "⚠"
		case project.FileStatusDeleted:
			statusStyle = ErrorStyle
			statusIcon = "✗"
		case project.FileStatusNew:
			statusStyle = HighlightStyle
			statusIcon = "+"
		default:
			statusStyle = SubtleStyle
			statusIcon = "?"
		}

		status := statusStyle.Render(fmt.Sprintf("%s %-10s", statusIcon, f.Status.String()))
		fmt.Printf("%-*s  %s  %s\n", maxPathLen, path, status, SubtleStyle.Render(f.Action))
	}

	fmt.Println()
}

// ConflictResolution represents how to handle a conflict
type ConflictResolution string

const (
	ResolutionSkip      ConflictResolution = "skip"
	ResolutionOverwrite ConflictResolution = "overwrite"
	ResolutionBackup    ConflictResolution = "backup"
	ResolutionView      ConflictResolution = "view"
)

// ShowConflictResolution asks the user how to handle conflicts
func ShowConflictResolution(modifiedCount int) (ConflictResolution, error) {
	var choice ConflictResolution

	desc := fmt.Sprintf("%d file(s) have been modified since generation", modifiedCount)

	err := huh.NewSelect[ConflictResolution]().
		Title("How should we handle modified files?").
		Description(desc).
		Options(
			huh.NewOption("Skip modified files (keep your changes)", ResolutionSkip),
			huh.NewOption("Backup and overwrite", ResolutionBackup),
			huh.NewOption("View changes first", ResolutionView),
			huh.NewOption("Overwrite all (lose changes)", ResolutionOverwrite),
		).
		Value(&choice).
		Run()

	return choice, err
}

// ShowPerFileResolution asks the user what to do with each modified file
func ShowPerFileResolution(path string, diff string) (ConflictResolution, error) {
	// Show the diff
	fmt.Println()
	fmt.Println(TitleStyle.Render("Changes in: ") + path)
	fmt.Println(strings.Repeat("─", 50))

	// Format diff with colors
	lines := strings.Split(diff, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "+") && !strings.HasPrefix(line, "+++") {
			fmt.Println(SuccessStyle.Render(line))
		} else if strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "---") {
			fmt.Println(ErrorStyle.Render(line))
		} else {
			fmt.Println(SubtleStyle.Render(line))
		}
	}
	fmt.Println(strings.Repeat("─", 50))

	var choice ConflictResolution

	err := huh.NewSelect[ConflictResolution]().
		Title("What should we do with this file?").
		Options(
			huh.NewOption("Skip (keep my version)", ResolutionSkip),
			huh.NewOption("Backup and overwrite", ResolutionBackup),
			huh.NewOption("Overwrite (lose my changes)", ResolutionOverwrite),
		).
		Value(&choice).
		Run()

	return choice, err
}

// ShowUpdateSummary shows a summary after update
func ShowUpdateSummary(updated, skipped, backedUp, created []string, errors []error) {
	fmt.Println()
	fmt.Println(TitleStyle.Render("Update Summary"))
	fmt.Println(strings.Repeat("─", 40))

	if len(created) > 0 {
		fmt.Printf("%s %d file(s) created\n", SuccessStyle.Render("✓"), len(created))
		for _, f := range created {
			fmt.Printf("  %s %s\n", HighlightStyle.Render("+"), f)
		}
	}

	if len(updated) > 0 {
		fmt.Printf("%s %d file(s) updated\n", SuccessStyle.Render("✓"), len(updated))
	}

	if len(backedUp) > 0 {
		fmt.Printf("%s %d file(s) backed up\n", WarningStyle.Render("!"), len(backedUp))
		fmt.Println(SubtleStyle.Render("  Backups saved to .pdfforge-backup/"))
	}

	if len(skipped) > 0 {
		fmt.Printf("%s %d file(s) skipped (modified)\n", SubtleStyle.Render("→"), len(skipped))
		for _, f := range skipped {
			fmt.Printf("  %s %s\n", WarningStyle.Render("⚠"), f)
		}
	}

	if len(errors) > 0 {
		fmt.Printf("%s %d error(s)\n", ErrorStyle.Render("✗"), len(errors))
		for _, e := range errors {
			fmt.Printf("  %s\n", e.Error())
		}
	}

	fmt.Println()
}
