package cmd

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/huh"
	"github.com/spf13/cobra"
)

const quitOption = "__quit__"

var runScriptCmd = &cobra.Command{
	Use:   "run-script [name]",
	Short: "Run a script from scripts/",
	Long:  `Run a project script. Without args, shows interactive selector.`,
	Args:  cobra.MaximumNArgs(1),
	RunE:  runScript,
}

func init() {
	rootCmd.AddCommand(runScriptCmd)
}

func runScript(cmd *cobra.Command, args []string) error {
	scriptsDir := "scripts"

	// Check scripts dir exists
	if _, err := os.Stat(scriptsDir); os.IsNotExist(err) {
		return fmt.Errorf("no scripts/ directory")
	}

	// List scripts
	entries, err := os.ReadDir(scriptsDir)
	if err != nil {
		return err
	}

	var scripts []string
	for _, e := range entries {
		if e.IsDir() {
			// Check has Makefile with run target
			makefile := filepath.Join(scriptsDir, e.Name(), "Makefile")
			if _, err := os.Stat(makefile); err == nil {
				scripts = append(scripts, e.Name())
			}
		}
	}

	if len(scripts) == 0 {
		fmt.Println("No scripts available")
		return nil
	}

	var selected string

	if len(args) > 0 {
		// Direct execution
		selected = args[0]
		// Validate exists
		found := false
		for _, s := range scripts {
			if s == selected {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("script '%s' not found", selected)
		}
	} else {
		// Interactive selection
		options := make([]huh.Option[string], len(scripts)+1)
		for i, s := range scripts {
			options[i] = huh.NewOption(s, s)
		}
		// Add quit option at the end
		options[len(scripts)] = huh.NewOption("Quit", quitOption)

		// Custom keymap with 'q' as quit key
		keymap := huh.NewDefaultKeyMap()
		keymap.Quit = key.NewBinding(
			key.WithKeys("q", "esc", "ctrl+c"),
			key.WithHelp("q", "quit"),
		)

		selectField := huh.NewSelect[string]().
			Title("Select script").
			Description("Press q to quit").
			Options(options...).
			Value(&selected)

		form := huh.NewForm(huh.NewGroup(selectField)).
			WithKeyMap(keymap)

		err := form.Run()
		if err != nil {
			if errors.Is(err, huh.ErrUserAborted) {
				return nil
			}
			return err
		}

		// Check if user selected quit
		if selected == quitOption {
			return nil
		}
	}

	// Execute
	scriptDir := filepath.Join(scriptsDir, selected)
	makeCmd := exec.Command("make", "-C", scriptDir, "run")
	makeCmd.Stdout = os.Stdout
	makeCmd.Stderr = os.Stderr
	makeCmd.Stdin = os.Stdin
	return makeCmd.Run()
}
