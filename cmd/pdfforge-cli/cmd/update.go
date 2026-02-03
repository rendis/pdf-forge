package cmd

import (
	"fmt"

	"github.com/charmbracelet/huh"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/updater"
	"github.com/spf13/cobra"
)

var (
	updateCheck bool
)

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update the CLI to the latest version",
	Long: `Check for and install CLI updates from GitHub releases.

Use --check to only check for updates without installing.`,
	RunE: runUpdate,
}

func init() {
	updateCmd.Flags().BoolVar(&updateCheck, "check", false, "Only check for updates, don't install")
	rootCmd.AddCommand(updateCmd)
}

func runUpdate(cmd *cobra.Command, args []string) error {
	fmt.Println(titleStyle.Render("Checking for updates..."))

	result, err := updater.CheckForUpdate(Version)
	if err != nil {
		return fmt.Errorf("failed to check for updates: %w", err)
	}

	if !result.HasUpdate {
		printSuccess(fmt.Sprintf("You're on the latest version (%s)", Version))
		return nil
	}

	fmt.Printf("\n%s New version available: %s → %s\n\n",
		warningStyle.Render("!"),
		subtleStyle.Render(result.CurrentVersion),
		successStyle.Render(result.LatestVersion))

	if updateCheck {
		fmt.Println("Run 'pdfforge-cli update' to install the update.")
		return nil
	}

	// Confirm update
	var confirm bool
	err = huh.NewConfirm().
		Title("Install update?").
		Description(fmt.Sprintf("Update from %s to %s", result.CurrentVersion, result.LatestVersion)).
		Value(&confirm).
		Run()
	if err != nil {
		return err
	}

	if !confirm {
		fmt.Println("Update cancelled.")
		return nil
	}

	fmt.Println()
	printInfo("Downloading and installing update...")

	if err := updater.SelfUpdate(Version); err != nil {
		return fmt.Errorf("update failed: %w", err)
	}

	printSuccess(fmt.Sprintf("Successfully updated to %s", result.LatestVersion))
	fmt.Println()
	fmt.Println("Restart your terminal to use the new version.")

	return nil
}
