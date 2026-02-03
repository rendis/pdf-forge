package tui

import (
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

// Styles
var (
	TitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("99")).
			MarginBottom(1)

	SuccessStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("46"))

	ErrorStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("196"))

	WarningStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("214"))

	SubtleStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("241"))

	HighlightStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("212"))
)

// MenuOption represents a main menu option
type MenuOption string

const (
	MenuInstallUpdate MenuOption = "install"
	MenuDoctor        MenuOption = "doctor"
	MenuMigrate       MenuOption = "migrate"
	MenuExit          MenuOption = "exit"
)

// ShowMainMenu displays the main command center menu
func ShowMainMenu() (MenuOption, error) {
	var choice MenuOption

	err := huh.NewSelect[MenuOption]().
		Title("PDF Forge - Command Center").
		Description("What would you like to do?").
		Options(
			huh.NewOption("Install/Update Project", MenuInstallUpdate),
			huh.NewOption("Check System (doctor)", MenuDoctor),
			huh.NewOption("Run Migrations", MenuMigrate),
			huh.NewOption("Exit", MenuExit),
		).
		Value(&choice).
		Run()

	return choice, err
}

// ProjectStatus represents the detected project status
type ProjectStatus int

const (
	ProjectStatusNew ProjectStatus = iota
	ProjectStatusExisting
	ProjectStatusOutdated
)

// ShowInstallMenu shows options based on project status
func ShowInstallMenu(status ProjectStatus, currentVersion, latestVersion string) (string, error) {
	var choice string
	var options []huh.Option[string]

	switch status {
	case ProjectStatusNew:
		options = []huh.Option[string]{
			huh.NewOption("Create new project here", "create"),
			huh.NewOption("Create in subdirectory", "subdir"),
			huh.NewOption("← Back", "back"),
		}
	case ProjectStatusExisting:
		options = []huh.Option[string]{
			huh.NewOption("Project is up to date ("+currentVersion+")", "uptodate"),
			huh.NewOption("Reinstall/Reset project files", "reinstall"),
			huh.NewOption("← Back", "back"),
		}
	case ProjectStatusOutdated:
		options = []huh.Option[string]{
			huh.NewOption("Update project ("+currentVersion+" → "+latestVersion+")", "update"),
			huh.NewOption("Skip update", "skip"),
			huh.NewOption("← Back", "back"),
		}
	}

	err := huh.NewSelect[string]().
		Title("Project Installation").
		Options(options...).
		Value(&choice).
		Run()

	return choice, err
}

// FileConflictAction represents how to handle file conflicts
type FileConflictAction string

const (
	ConflictSkip      FileConflictAction = "skip"
	ConflictOverwrite FileConflictAction = "overwrite"
	ConflictBackup    FileConflictAction = "backup"
	ConflictDiff      FileConflictAction = "diff"
)

// ShowConflictMenu shows options for handling modified files
func ShowConflictMenu(modifiedFiles []string) (FileConflictAction, error) {
	var choice FileConflictAction

	desc := SubtleStyle.Render("Modified files: ") + WarningStyle.Render(string(rune(len(modifiedFiles))))

	err := huh.NewSelect[FileConflictAction]().
		Title("How to handle modified files?").
		Description(desc).
		Options(
			huh.NewOption("Skip modified (keep your changes)", ConflictSkip),
			huh.NewOption("Show diff and decide per file", ConflictDiff),
			huh.NewOption("Backup and overwrite", ConflictBackup),
			huh.NewOption("Overwrite all (dangerous)", ConflictOverwrite),
		).
		Value(&choice).
		Run()

	return choice, err
}

// Confirm shows a confirmation dialog
func Confirm(title, description string) (bool, error) {
	var confirmed bool

	err := huh.NewConfirm().
		Title(title).
		Description(description).
		Value(&confirmed).
		Run()

	return confirmed, err
}

// InputText shows a text input
func InputText(title, description, placeholder string) (string, error) {
	var value string

	err := huh.NewInput().
		Title(title).
		Description(description).
		Placeholder(placeholder).
		Value(&value).
		Run()

	return value, err
}
