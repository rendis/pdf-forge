package cmd

import (
	"fmt"

	"github.com/rendis/pdf-forge/internal/migrations"
	"github.com/spf13/cobra"
)

var migrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Run database migrations",
	Long:  `Apply all pending database migrations to initialize or update the schema.`,
	RunE:  runMigrate,
}

func init() {
	rootCmd.AddCommand(migrateCmd)
}

func runMigrate(cmd *cobra.Command, args []string) error {
	fmt.Println(titleStyle.Render("Running migrations..."))

	cfg, err := loadConfig()
	if err != nil {
		return fmt.Errorf("config error: %w", err)
	}

	if err := migrations.Run(&cfg.Database); err != nil {
		return fmt.Errorf("migration error: %w", err)
	}

	printSuccess("Migrations applied successfully")
	return nil
}
