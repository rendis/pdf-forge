package cmd

import (
	"fmt"
	"runtime"

	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("%s v%s\n", titleStyle.Render("pdfforge-cli"), Version)
		fmt.Printf("%s %s/%s\n", subtleStyle.Render("Platform:"), runtime.GOOS, runtime.GOARCH)
		fmt.Printf("%s %s\n", subtleStyle.Render("Go:"), runtime.Version())
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
