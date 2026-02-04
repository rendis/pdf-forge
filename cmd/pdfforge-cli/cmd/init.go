package cmd

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/project"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/templates"
	"github.com/spf13/cobra"
)

var (
	// Flags
	initModuleName      string
	initIncludeExamples bool
	initIncludeDocker   bool
	initGitInit         bool
	initNonInteractive  bool
)

// forgeModuleRoot is set at build time via -ldflags
var forgeModuleRoot string

var initCmd = &cobra.Command{
	Use:   "init [project-name]",
	Short: "Scaffold a new pdf-forge project",
	Long: `Create a new pdf-forge project with all necessary files and configuration.

If no project name is provided, an interactive wizard will guide you through the setup.`,
	Args: cobra.MaximumNArgs(1),
	RunE: runInit,
}

func init() {
	initCmd.Flags().StringVarP(&initModuleName, "module", "m", "", "Go module name (default: project name)")
	initCmd.Flags().BoolVar(&initIncludeExamples, "examples", true, "Include example injectors")
	initCmd.Flags().BoolVar(&initIncludeDocker, "docker", true, "Include Docker setup")
	initCmd.Flags().BoolVar(&initGitInit, "git", false, "Initialize git repository")
	initCmd.Flags().BoolVarP(&initNonInteractive, "yes", "y", false, "Non-interactive mode (use defaults)")

	rootCmd.AddCommand(initCmd)
}

func runInit(cmd *cobra.Command, args []string) error {
	var projectName string

	// Determine project name
	if len(args) > 0 {
		projectName = args[0]
	} else if initNonInteractive {
		return fmt.Errorf("project name required in non-interactive mode")
	}

	// Interactive mode if no project name and not --yes
	if projectName == "" && !initNonInteractive {
		config, err := runInteractiveInit()
		if err != nil {
			return err
		}
		projectName = config.ProjectName
		initModuleName = config.ModuleName
		initIncludeExamples = config.IncludeExamples
		initIncludeDocker = config.IncludeDocker
		initGitInit = config.GitInit
	}

	// CASE 1: init my-project (subdirectory)
	if projectName != "." {
		if info, err := os.Stat(projectName); err == nil && info.IsDir() {
			entries, _ := os.ReadDir(projectName)
			if len(entries) > 0 {
				return fmt.Errorf("directory %q already has content.\nTo update an existing project, run:\n  cd %s && pdfforge-cli init .", projectName, projectName)
			}
		}
	}

	// CASE 2: init . (current directory) - check for existing project
	if projectName == "." {
		lockFile, err := project.LoadLockFile(".")
		if err == nil && lockFile != nil {
			// Project exists - use minimal update mode
			return runMinimalUpdate(".", lockFile)
		}
	}

	// Generate new project
	return generateNewProject(projectName)
}

// runMinimalUpdate updates an existing project without touching user files
func runMinimalUpdate(projectDir string, currentLock *project.LockFile) error {
	fmt.Println()
	printInfo(fmt.Sprintf("Existing pdf-forge project detected (v%s)", currentLock.Version))
	printInfo(fmt.Sprintf("Updating to v%s", Version))

	// 1. Check for deleted files that need to be recreated
	var deletedFiles []string
	var existingFiles []string
	for filePath := range currentLock.Files {
		fullPath := filepath.Join(projectDir, filePath)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			deletedFiles = append(deletedFiles, filePath)
		} else {
			existingFiles = append(existingFiles, filePath)
		}
	}

	// 2. Recreate deleted files
	if len(deletedFiles) > 0 {
		fmt.Println()
		printInfo("Recreating deleted files:")

		data := templates.Data{
			ModuleName:  detectModuleName(projectDir),
			ProjectName: filepath.Base(projectDir),
		}

		sort.Strings(deletedFiles)
		for _, filePath := range deletedFiles {
			tmplName := getTemplateNameForFile(filePath)
			if tmplName == "" {
				printWarning(fmt.Sprintf("  ✗ %s: unknown template", filePath))
				continue
			}

			tmpl := templates.Templates.Lookup(tmplName)
			if tmpl == nil {
				printWarning(fmt.Sprintf("  ✗ %s: template not found", filePath))
				continue
			}

			var buf bytes.Buffer
			if err := tmpl.Execute(&buf, data); err != nil {
				printWarning(fmt.Sprintf("  ✗ %s: %v", filePath, err))
				continue
			}

			fullPath := filepath.Join(projectDir, filePath)
			if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
				printWarning(fmt.Sprintf("  ✗ %s: %v", filePath, err))
				continue
			}

			if err := os.WriteFile(fullPath, buf.Bytes(), 0o644); err != nil {
				printWarning(fmt.Sprintf("  ✗ %s: %v", filePath, err))
				continue
			}

			fmt.Printf("  ✓ %s\n", filePath)
		}
	}

	// 3. Update lock file version
	newLock := project.NewLockFile(Version)
	newLock.Files = currentLock.Files

	// 4. Update go.mod dependency
	fmt.Println()
	printInfo("Updating go.mod dependency...")
	goGetCmd := exec.Command("go", "get", "-u", "github.com/rendis/pdf-forge/sdk@latest")
	goGetCmd.Dir = projectDir
	goGetCmd.Stdout = os.Stdout
	goGetCmd.Stderr = os.Stderr
	if err := goGetCmd.Run(); err != nil {
		printWarning(fmt.Sprintf("go get failed: %v", err))
	}

	// 5. List skipped files (only existing ones)
	if len(existingFiles) > 0 {
		fmt.Println()
		printInfo("Skipped (already exist):")
		sort.Strings(existingFiles)
		for _, f := range existingFiles {
			fmt.Printf("  - %s\n", f)
		}
	}

	// 6. Save updated lock file
	if err := newLock.Save(projectDir); err != nil {
		printWarning(fmt.Sprintf("lock file update failed: %v", err))
	}

	fmt.Println()
	printSuccess("Update complete")
	printInfo("Run 'go mod tidy' to finalize dependencies")
	return nil
}

// detectModuleName reads the module name from go.mod
func detectModuleName(projectDir string) string {
	goModPath := filepath.Join(projectDir, "go.mod")
	content, err := os.ReadFile(goModPath)
	if err != nil {
		return filepath.Base(projectDir)
	}

	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "module ") {
			return strings.TrimSpace(strings.TrimPrefix(line, "module "))
		}
	}
	return filepath.Base(projectDir)
}

// generateNewProject creates a new pdf-forge project from scratch
func generateNewProject(projectName string) error {
	// Use base name as module if not specified
	moduleName := initModuleName
	if moduleName == "" {
		if projectName == "." {
			cwd, err := os.Getwd()
			if err != nil {
				return fmt.Errorf("cannot determine current directory: %w", err)
			}
			moduleName = filepath.Base(cwd)
		} else {
			moduleName = filepath.Base(projectName)
		}
	}

	fmt.Println()
	fmt.Println(titleStyle.Render("Creating project: ") + projectName)

	// Create directory structure
	dirs := []string{
		projectName,
		projectName + "/config",
		projectName + "/scripts",
	}
	if initIncludeExamples {
		dirs = append(dirs, projectName+"/extensions/injectors")
	} else {
		dirs = append(dirs, projectName+"/extensions")
	}

	for _, d := range dirs {
		if err := os.MkdirAll(d, 0o755); err != nil {
			return fmt.Errorf("error creating %s: %w", d, err)
		}
	}

	// Prepare template data
	data := templates.Data{
		ProjectName: projectName,
		ModuleName:  moduleName,
		GoVersion:   "1.25.1",
		ForgeRoot:   findForgeRoot(),
	}

	// Generate files
	files := map[string]string{
		projectName + "/main.go":                          "main.go.tmpl",
		projectName + "/config/app.yaml":                  "app.yaml.tmpl",
		projectName + "/config/injectors.i18n.yaml":       "i18n.yaml.tmpl",
		projectName + "/extensions/mapper.go":             "mapper.go.tmpl",
		projectName + "/extensions/init.go":               "init.go.tmpl",
		projectName + "/extensions/middleware.go":         "middleware.go.tmpl",
		projectName + "/extensions/workspace_provider.go": "workspace_provider.go.tmpl",
		projectName + "/scripts/README.md":                "scripts_readme.md.tmpl",
		projectName + "/go.mod":                           "go.mod.tmpl",
	}

	if initIncludeExamples {
		files[projectName+"/extensions/injectors/example_value.go"] = "example_value.go.tmpl"
		files[projectName+"/extensions/injectors/example_number.go"] = "example_number.go.tmpl"
		files[projectName+"/extensions/injectors/example_bool.go"] = "example_bool.go.tmpl"
		files[projectName+"/extensions/injectors/example_time.go"] = "example_time.go.tmpl"
		files[projectName+"/extensions/injectors/example_image.go"] = "example_image.go.tmpl"
		files[projectName+"/extensions/injectors/example_table.go"] = "example_table.go.tmpl"
		files[projectName+"/extensions/injectors/example_list.go"] = "example_list.go.tmpl"
	}

	if initIncludeDocker {
		files[projectName+"/docker-compose.yaml"] = "docker-compose.yaml.tmpl"
		files[projectName+"/Dockerfile"] = "Dockerfile.tmpl"
		files[projectName+"/Makefile"] = "Makefile.tmpl"
		files[projectName+"/.env.example"] = "env.tmpl"
		files[projectName+"/.golangci.yml"] = "golangci.yml.tmpl"
	}

	// Create lock file to track generated files
	lockFile := project.NewLockFile(Version)

	// Check for existing files that would be overwritten
	var existingFiles []string
	for path := range files {
		if _, err := os.Stat(path); err == nil {
			existingFiles = append(existingFiles, path)
		}
	}

	// If there are existing files, warn and ask for confirmation
	if len(existingFiles) > 0 && !initNonInteractive {
		fmt.Println()
		printWarning(fmt.Sprintf("Found %d existing files that will be overwritten:", len(existingFiles)))
		for _, f := range existingFiles {
			fmt.Printf("  - %s\n", f)
		}
		fmt.Println()

		var confirm bool
		err := huh.NewConfirm().
			Title("Continue with init?").
			Description("Existing files will be overwritten.").
			Value(&confirm).
			Run()
		if err != nil {
			return err
		}
		if !confirm {
			printInfo("Init cancelled")
			return nil
		}
	}

	// Write files from templates
	for path, tmplName := range files {
		content, err := renderTemplate(tmplName, data)
		if err != nil {
			return fmt.Errorf("error rendering %s: %w", path, err)
		}

		if err := os.WriteFile(path, content, 0o644); err != nil {
			return fmt.Errorf("error writing %s: %w", path, err)
		}

		// Track in lock file
		relPath := strings.TrimPrefix(path, projectName+"/")
		lockFile.AddFile(relPath, Version, content)
		printInfo("Created " + path)
	}

	// Save lock file
	if err := lockFile.Save(projectName); err != nil {
		printWarning(fmt.Sprintf("failed to create lock file: %v", err))
	}

	// Run go mod tidy
	fmt.Println()
	printInfo("Running go mod tidy...")
	tidyCmd := exec.Command("go", "mod", "tidy")
	tidyCmd.Dir = projectName
	tidyCmd.Stdout = os.Stdout
	tidyCmd.Stderr = os.Stderr
	if err := tidyCmd.Run(); err != nil {
		printWarning(fmt.Sprintf("go mod tidy failed: %v (run manually)", err))
	}

	// Initialize git if requested
	if initGitInit {
		printInfo("Initializing git repository...")
		gitCmd := exec.Command("git", "init")
		gitCmd.Dir = projectName
		if err := gitCmd.Run(); err != nil {
			printWarning(fmt.Sprintf("git init failed: %v", err))
		} else {
			// Create .gitignore
			gitignore := `# Binaries
/bin/
*.exe

# IDE
.idea/
.vscode/
*.swp

# Environment
.env

# OS
.DS_Store
`
			if err := os.WriteFile(projectName+"/.gitignore", []byte(gitignore), 0o644); err != nil {
				printWarning(fmt.Sprintf("failed to create .gitignore: %v", err))
			}
		}
	}

	// Success message
	fmt.Println()
	printSuccess(fmt.Sprintf("Project %q created successfully!", projectName))
	fmt.Println()
	fmt.Println(subtleStyle.Render("Next steps:"))
	fmt.Printf("  cd %s\n", projectName)
	if initIncludeDocker {
		fmt.Println("  make fresh           # check prereqs, start PG, build and run")
	} else {
		fmt.Println("  go run .             # start the server")
	}
	fmt.Println()
	fmt.Println("  Open http://localhost:8080 once the server starts.")
	if initIncludeDocker {
		fmt.Println()
		fmt.Println("  make help            # see all available targets")
	}

	return nil
}

type initConfig struct {
	ProjectName     string
	ModuleName      string
	IncludeExamples bool
	IncludeDocker   bool
	GitInit         bool
}

func runInteractiveInit() (*initConfig, error) {
	config := &initConfig{
		IncludeExamples: true,
		IncludeDocker:   true,
	}

	// Project name
	err := huh.NewInput().
		Title("Project name").
		Description("Name of the directory to create").
		Placeholder("my-pdf-app").
		Value(&config.ProjectName).
		Validate(func(s string) error {
			if s == "" {
				return fmt.Errorf("project name is required")
			}
			if s != "." {
				if _, err := os.Stat(s); err == nil {
					return fmt.Errorf("directory %q already exists", s)
				}
			}
			return nil
		}).
		Run()
	if err != nil {
		return nil, err
	}

	// Module name (with default)
	defaultModule := config.ProjectName
	if defaultModule == "." {
		if cwd, err := os.Getwd(); err == nil {
			defaultModule = filepath.Base(cwd)
		}
	}
	err = huh.NewInput().
		Title("Go module name").
		Description("The Go module path for your project").
		Placeholder(defaultModule).
		Value(&config.ModuleName).
		Run()
	if err != nil {
		return nil, err
	}
	if config.ModuleName == "" {
		config.ModuleName = defaultModule
	}

	// Options form
	err = huh.NewForm(
		huh.NewGroup(
			huh.NewConfirm().
				Title("Include example injectors?").
				Description("Add sample injectors for each value type").
				Value(&config.IncludeExamples),
			huh.NewConfirm().
				Title("Include Docker setup?").
				Description("Add docker-compose, Dockerfile, and Makefile").
				Value(&config.IncludeDocker),
			huh.NewConfirm().
				Title("Initialize git repository?").
				Description("Run git init and create .gitignore").
				Value(&config.GitInit),
		),
	).Run()
	if err != nil {
		return nil, err
	}

	return config, nil
}

func renderTemplate(tmplName string, data templates.Data) ([]byte, error) {
	tmpl := templates.Templates.Lookup(tmplName)
	if tmpl == nil {
		return nil, fmt.Errorf("template %q not found", tmplName)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// findForgeRoot returns the local pdf-forge source directory for use in go.mod replace directives.
func findForgeRoot() string {
	if forgeModuleRoot != "" {
		if _, err := os.Stat(filepath.Join(forgeModuleRoot, "go.mod")); err == nil {
			return forgeModuleRoot
		}
	}
	// Fallback: try to locate via go list (works if run from within the module tree)
	out, err := exec.Command("go", "list", "-m", "-f", "{{.Dir}}", "github.com/rendis/pdf-forge").Output()
	if err == nil {
		dir := strings.TrimSpace(string(out))
		if dir != "" {
			return dir
		}
	}
	return ""
}
