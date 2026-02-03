package cmd

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/project"
	"github.com/rendis/pdf-forge/cmd/pdfforge-cli/internal/templates"
	"github.com/rendis/pdf-forge/skills"
	"github.com/spf13/cobra"
)

var (
	// Flags
	initModuleName     string
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

	// Validate project doesn't exist (skip for "." which always exists)
	if projectName != "." {
		if _, err := os.Stat(projectName); err == nil {
			return fmt.Errorf("directory %q already exists", projectName)
		}
	}

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
		projectName + "/main.go":                    "main.go.tmpl",
		projectName + "/config/app.yaml":            "app.yaml.tmpl",
		projectName + "/config/injectors.i18n.yaml": "i18n.yaml.tmpl",
		projectName + "/extensions/mapper.go":       "mapper.go.tmpl",
		projectName + "/extensions/init.go":         "init.go.tmpl",
		projectName + "/extensions/middleware.go":   "middleware.go.tmpl",
		projectName + "/go.mod":                     "go.mod.tmpl",
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
	}

	// Create lock file to track generated files
	lockFile := project.NewLockFile(Version)

	// Write files from templates
	for path, tmplName := range files {
		content, err := renderTemplate(tmplName, data)
		if err != nil {
			return fmt.Errorf("error rendering %s: %w", path, err)
		}

		if err := os.WriteFile(path, content, 0o644); err != nil {
			return fmt.Errorf("error writing %s: %w", path, err)
		}

		// Track in lock file (use relative path from project root)
		relPath := strings.TrimPrefix(path, projectName+"/")
		lockFile.AddFile(relPath, Version, content)
		printInfo("Created " + path)
	}

	// Save lock file
	if err := lockFile.Save(projectName); err != nil {
		printWarning(fmt.Sprintf("failed to create lock file: %v", err))
	}

	// Copy pdf-forge skill
	if err := copySkill(projectName); err != nil {
		printWarning(fmt.Sprintf("failed to copy skill: %v", err))
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

// copySkill copies the pdf-forge skill files to the project's .agents/skills directory
func copySkill(projectName string) error {
	skillDir := filepath.Join(projectName, ".agents", "skills", "pdf-forge")

	// Read all files from embedded FS
	entries, err := skills.PDFForgeSkillFS.ReadDir("pdf-forge")
	if err != nil {
		return fmt.Errorf("reading embedded skill files: %w", err)
	}

	// Create directory
	if err := os.MkdirAll(skillDir, 0o755); err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue // skip subdirs
		}

		content, err := skills.PDFForgeSkillFS.ReadFile("pdf-forge/" + entry.Name())
		if err != nil {
			return fmt.Errorf("reading %s: %w", entry.Name(), err)
		}

		destPath := filepath.Join(skillDir, entry.Name())

		// Check if file exists and compare content
		if existing, err := os.ReadFile(destPath); err == nil {
			if bytes.Equal(existing, content) {
				continue // same content, skip
			}
			// Content is different - ask for confirmation
			confirmed, err := askSkillFileOverwrite(entry.Name())
			if err != nil {
				return err
			}
			if !confirmed {
				continue
			}
		}

		if err := os.WriteFile(destPath, content, 0o644); err != nil {
			return fmt.Errorf("writing %s: %w", entry.Name(), err)
		}
		printInfo("Created .agents/skills/pdf-forge/" + entry.Name())
	}

	return nil
}

// askSkillFileOverwrite asks user if they want to update an existing skill file
func askSkillFileOverwrite(filename string) (bool, error) {
	if initNonInteractive {
		return true, nil // In non-interactive mode, always update
	}

	var confirmed bool
	err := huh.NewConfirm().
		Title(fmt.Sprintf("Update %s?", filename)).
		Description("The skill file has changed. Update to the latest version?").
		Value(&confirmed).
		Run()
	return confirmed, err
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
