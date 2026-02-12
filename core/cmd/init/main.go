// Command init scaffolds a new pdf-forge project.
//
// Usage:
//
//	go run github.com/rendis/pdf-forge/core/cmd/init@latest my-project
//	go run github.com/rendis/pdf-forge/core/cmd/init@latest my-project --module github.com/myorg/my-project
//	go run github.com/rendis/pdf-forge/core/cmd/init@latest my-project --force
package main

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"text/template"
)

//go:embed all:templates
var templateFS embed.FS

type templateData struct {
	Module      string
	ProjectName string
}

// fileMapping maps template paths to output paths.
var fileMapping = []struct {
	src string
	dst string
}{
	{"templates/main.go.tmpl", "main.go"},
	{"templates/extensions/register.go.tmpl", "extensions/register.go"},
	{"templates/extensions/injectors/example_value.go.tmpl", "extensions/injectors/example_value.go"},
	{"templates/extensions/mapper.go.tmpl", "extensions/mapper.go"},
	{"templates/extensions/init.go.tmpl", "extensions/init.go"},
	{"templates/extensions/provider.go.tmpl", "extensions/provider.go"},
	{"templates/extensions/auth.go.tmpl", "extensions/auth.go"},
	{"templates/extensions/middleware.go.tmpl", "extensions/middleware.go"},
	{"templates/settings/app.yaml.tmpl", "settings/app.yaml"},
	{"templates/Makefile.tmpl", "Makefile"},
	{"templates/Dockerfile.tmpl", "Dockerfile"},
	{"templates/docker-compose.yaml.tmpl", "docker-compose.yaml"},
	{"templates/dot-env.example.tmpl", ".env.example"},
	{"templates/dot-gitignore.tmpl", ".gitignore"},
	{"templates/dot-air.toml.tmpl", ".air.toml"},
	{"templates/README.md.tmpl", "README.md"},
	{"templates/scripts_readme.md.tmpl", "scripts/README.md"},
}

// ANSI color helpers.
const (
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorCyan   = "\033[36m"
	colorReset  = "\033[0m"
)

func main() {
	if len(os.Args) < 2 || os.Args[1] == "-h" || os.Args[1] == "--help" {
		printUsage()
		os.Exit(0)
	}

	projectName := os.Args[1]
	modulePath := projectName // default module = project name
	force := false

	// Parse flags
	for i, arg := range os.Args {
		if arg == "--module" && i+1 < len(os.Args) {
			modulePath = os.Args[i+1]
		}
		if strings.HasPrefix(arg, "--module=") {
			modulePath = strings.TrimPrefix(arg, "--module=")
		}
		if arg == "--force" {
			force = true
		}
	}

	if err := run(projectName, modulePath, force); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

type fileCounts struct {
	created, skipped, overwritten int
}

func (c *fileCounts) track(action fileAction) {
	switch action {
	case actionCreated:
		c.created++
	case actionSkipped:
		c.skipped++
	case actionOverwritten:
		c.overwritten++
	}
}

func run(projectName, modulePath string, force bool) error {
	outDir, err := filepath.Abs(projectName)
	if err != nil {
		return fmt.Errorf("resolving path: %w", err)
	}

	displayName := filepath.Base(outDir)
	data := templateData{Module: modulePath, ProjectName: displayName}

	fmt.Printf("Initializing project %s...\n\n", displayName)

	counts, err := generateFiles(outDir, data, modulePath, force)
	if err != nil {
		return err
	}

	printSummary(counts, force)
	printNextSteps(displayName)
	return nil
}

func generateFiles(outDir string, data templateData, modulePath string, force bool) (fileCounts, error) {
	var counts fileCounts

	for _, fm := range fileMapping {
		dstPath := filepath.Join(outDir, fm.dst)
		if err := os.MkdirAll(filepath.Dir(dstPath), 0o755); err != nil {
			return counts, fmt.Errorf("creating directory for %s: %w", fm.dst, err)
		}
		action, err := writeTemplateFile(templateFS, fm.src, dstPath, data, force)
		if err != nil {
			return counts, fmt.Errorf("%s: %w", fm.dst, err)
		}
		printAction(action, fm.dst)
		counts.track(action)
	}

	// frontend-dist/.gitkeep
	gitkeepPath := filepath.Join(outDir, "frontend-dist", ".gitkeep")
	if err := os.MkdirAll(filepath.Dir(gitkeepPath), 0o755); err != nil {
		return counts, fmt.Errorf("creating frontend-dist: %w", err)
	}
	action := writeStaticFile(gitkeepPath, nil, force)
	printAction(action, "frontend-dist/.gitkeep")
	counts.track(action)

	// scripts/.gitkeep
	scriptsKeepPath := filepath.Join(outDir, "scripts", ".gitkeep")
	if err := os.MkdirAll(filepath.Dir(scriptsKeepPath), 0o755); err != nil {
		return counts, fmt.Errorf("creating scripts: %w", err)
	}
	action = writeStaticFile(scriptsKeepPath, nil, force)
	printAction(action, "scripts/.gitkeep")
	counts.track(action)

	// go.mod
	goModContent := []byte(fmt.Sprintf("module %s\n\ngo 1.25\n\nrequire github.com/rendis/pdf-forge v0.0.0\n", modulePath))
	action = writeStaticFile(filepath.Join(outDir, "go.mod"), goModContent, force)
	printAction(action, "go.mod")
	counts.track(action)

	return counts, nil
}

func printSummary(c fileCounts, force bool) {
	fmt.Println()
	parts := make([]string, 0, 3)
	if c.created > 0 {
		parts = append(parts, fmt.Sprintf("%d created", c.created))
	}
	if c.overwritten > 0 {
		parts = append(parts, fmt.Sprintf("%d overwritten", c.overwritten))
	}
	if c.skipped > 0 {
		parts = append(parts, fmt.Sprintf("%d skipped", c.skipped))
	}
	fmt.Printf("Done: %s.\n", strings.Join(parts, ", "))
	if c.skipped > 0 && !force {
		fmt.Println("Use --force to overwrite existing files.")
	}
}

func printNextSteps(displayName string) {
	fmt.Println()
	fmt.Println("Next steps:")
	fmt.Println()
	fmt.Printf("  cd %s\n", displayName)
	fmt.Println("  go mod tidy")
	fmt.Println("  make doctor")
	fmt.Println()
	fmt.Println("  # Run locally (auto-embeds frontend if Node.js + pnpm installed):")
	fmt.Println("  make migrate")
	fmt.Println("  make run")
	fmt.Println()
	fmt.Println("  # Or start with Docker (full stack with frontend):")
	fmt.Println("  docker compose up --build")
	fmt.Println()
}

type fileAction int

const (
	actionCreated fileAction = iota
	actionSkipped
	actionOverwritten
)

func printAction(action fileAction, path string) {
	switch action {
	case actionCreated:
		fmt.Printf("  %screated%s    %s\n", colorGreen, colorReset, path)
	case actionSkipped:
		fmt.Printf("  %sskipped%s    %s\n", colorYellow, colorReset, path)
	case actionOverwritten:
		fmt.Printf("  %soverwrite%s  %s\n", colorCyan, colorReset, path)
	}
}

func writeTemplateFile(fsys embed.FS, src, dstPath string, data templateData, force bool) (fileAction, error) {
	existed := fileExists(dstPath)
	if existed && !force {
		return actionSkipped, nil
	}

	content, err := fs.ReadFile(fsys, src)
	if err != nil {
		return 0, fmt.Errorf("reading template: %w", err)
	}

	tmpl, err := template.New(src).Parse(string(content))
	if err != nil {
		return 0, fmt.Errorf("parsing template: %w", err)
	}

	f, err := os.Create(dstPath)
	if err != nil {
		return 0, fmt.Errorf("creating file: %w", err)
	}
	defer f.Close()

	if err := tmpl.Execute(f, data); err != nil {
		return 0, fmt.Errorf("executing template: %w", err)
	}

	if existed {
		return actionOverwritten, nil
	}
	return actionCreated, nil
}

func writeStaticFile(path string, content []byte, force bool) fileAction {
	existed := fileExists(path)
	if existed && !force {
		return actionSkipped
	}

	if content == nil {
		content = []byte{}
	}
	if err := os.WriteFile(path, content, 0o600); err != nil {
		return actionCreated // best effort
	}

	if existed {
		return actionOverwritten
	}
	return actionCreated
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func printUsage() {
	fmt.Println("Usage: go run github.com/rendis/pdf-forge/core/cmd/init@latest <project-name> [flags]")
	fmt.Println()
	fmt.Println("Creates a new pdf-forge project with all necessary boilerplate.")
	fmt.Println("Safe to run in existing projects — skips files that already exist.")
	fmt.Println()
	fmt.Println("Arguments:")
	fmt.Println("  <project-name>    Name of the project directory to create")
	fmt.Println()
	fmt.Println("Flags:")
	fmt.Println("  --module <path>   Go module path (default: project name)")
	fmt.Println("  --force           Overwrite existing files")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  go run github.com/rendis/pdf-forge/core/cmd/init@latest my-docs")
	fmt.Println("  go run github.com/rendis/pdf-forge/core/cmd/init@latest my-docs --module github.com/myorg/my-docs")
	fmt.Println("  go run github.com/rendis/pdf-forge/core/cmd/init@latest my-docs --force")
}
