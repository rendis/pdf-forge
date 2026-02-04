package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres"
	"github.com/rendis/pdf-forge/internal/infra/config"
	"github.com/spf13/cobra"
)

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Check system requirements (Typst, DB, auth)",
	Long:  `Verify that all prerequisites are installed and configured correctly.`,
	Run:   runDoctor,
}

func init() {
	rootCmd.AddCommand(doctorCmd)
}

func runDoctor(cmd *cobra.Command, args []string) {
	fmt.Println(titleStyle.Render("pdf-forge doctor"))
	fmt.Println(strings.Repeat("─", 40))

	// Check Typst
	fmt.Print("Typst CLI ... ")
	out, err := exec.Command("typst", "--version").CombinedOutput()
	if err != nil {
		printError("NOT FOUND")
		fmt.Println(subtleStyle.Render("  Install: brew install typst (macOS) | cargo install typst-cli"))
	} else {
		printSuccess(strings.TrimSpace(string(out)))
	}

	// Check DB
	fmt.Print("PostgreSQL ... ")
	cfg, err := loadConfig()
	if err != nil {
		printError(fmt.Sprintf("CONFIG ERROR: %v", err))
		return
	}

	ctx := context.Background()
	pool, err := postgres.NewPool(ctx, &cfg.Database)
	if err != nil {
		printError(fmt.Sprintf("UNREACHABLE: %v", err))
	} else {
		if err := pool.Ping(ctx); err != nil {
			printError(fmt.Sprintf("PING FAILED: %v", err))
		} else {
			printSuccess(fmt.Sprintf("%s:%d/%s", cfg.Database.Host, cfg.Database.Port, cfg.Database.Name))

			// Check schema
			fmt.Print("DB Schema ... ")
			var exists bool
			err := pool.QueryRow(ctx,
				`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'tenancy' AND table_name = 'tenants')`,
			).Scan(&exists)
			if err != nil || !exists {
				printWarning("NOT INITIALIZED (run: pdfforge-cli migrate)")
			} else {
				printSuccess("OK")
			}
		}
		pool.Close()
	}

	// Check Auth
	fmt.Print("Auth ... ")
	providers := cfg.GetOIDCProviders()
	if len(providers) == 0 {
		printWarning("NOT CONFIGURED (will use dummy mode)")
	} else {
		printSuccess(fmt.Sprintf("%d OIDC provider(s) configured", len(providers)))
	}

	fmt.Println()
	fmt.Printf("%s %s/%s\n", subtleStyle.Render("OS:"), runtime.GOOS, runtime.GOARCH)
}

func loadConfig() (*config.Config, error) {
	// Try specific path first, then default
	if _, err := os.Stat("config/app.yaml"); err == nil {
		return config.LoadFromFile("config/app.yaml")
	}
	return config.Load()
}
