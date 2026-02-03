package cmd

import (
	"testing"

	"github.com/spf13/cobra"
)

func TestVersionCommand_Exists(t *testing.T) {
	// Find the version command
	var versionCmd *cobra.Command
	for _, cmd := range rootCmd.Commands() {
		if cmd.Name() == "version" {
			versionCmd = cmd
			break
		}
	}

	if versionCmd == nil {
		t.Fatal("version command not found")
	}

	if versionCmd.Use != "version" {
		t.Errorf("expected Use 'version', got %s", versionCmd.Use)
	}

	if versionCmd.Short == "" {
		t.Error("version command should have a short description")
	}
}

func TestRootCmd_HasVersion(t *testing.T) {
	if Version == "" {
		t.Error("Version should not be empty")
	}
}

func TestRootCmd_Structure(t *testing.T) {
	// Check that root command has expected properties
	if rootCmd.Use != "pdfforge-cli" {
		t.Errorf("expected Use 'pdfforge-cli', got %s", rootCmd.Use)
	}

	if rootCmd.Short == "" {
		t.Error("Short description should not be empty")
	}
}

func TestRootCmd_HasSubcommands(t *testing.T) {
	// Find expected subcommands
	subcommands := make(map[string]*cobra.Command)
	for _, cmd := range rootCmd.Commands() {
		subcommands[cmd.Name()] = cmd
	}

	expectedCommands := []string{"version", "doctor", "init", "migrate", "update"}
	for _, name := range expectedCommands {
		if _, exists := subcommands[name]; !exists {
			t.Errorf("expected subcommand '%s' not found", name)
		}
	}
}

func TestStyles(t *testing.T) {
	// Verify styles are initialized (not nil/panic)
	_ = titleStyle.Render("test")
	_ = successStyle.Render("test")
	_ = errorStyle.Render("test")
	_ = warningStyle.Render("test")
	_ = subtleStyle.Render("test")
}
