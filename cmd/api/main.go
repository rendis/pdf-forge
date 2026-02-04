package main

import (
	"log/slog"
	"os"

	"github.com/rendis/pdf-forge/sdk"
)

func main() {
	engine := sdk.New()

	if err := engine.Run(); err != nil {
		slog.Error("failed to run engine", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
