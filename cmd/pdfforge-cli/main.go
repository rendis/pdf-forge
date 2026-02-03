package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres"
	"github.com/rendis/pdf-forge/internal/infra/config"
	"github.com/rendis/pdf-forge/internal/migrations"
)

const version = "0.1.0"

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "version":
		fmt.Printf("pdfforge-cli v%s\n", version)
	case "doctor":
		runDoctor()
	case "migrate":
		runMigrate()
	case "init":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: pdfforge-cli init <project-name>")
			os.Exit(1)
		}
		runInit(os.Args[2])
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println(`pdfforge-cli — PDF Forge project toolkit

Commands:
  init <name>    Scaffold a new pdf-forge project
  migrate        Run database migrations
  doctor         Check system requirements (Typst, DB, auth)
  version        Print version`)
}

func runDoctor() {
	fmt.Println("pdf-forge doctor")
	fmt.Println("================")

	// Check Typst
	fmt.Print("Typst CLI ... ")
	out, err := exec.Command("typst", "--version").CombinedOutput()
	if err != nil {
		fmt.Println("NOT FOUND")
		fmt.Println("  Install: brew install typst (macOS) | cargo install typst-cli")
	} else {
		fmt.Printf("OK (%s)\n", strings.TrimSpace(string(out)))
	}

	// Check DB
	fmt.Print("PostgreSQL ... ")
	cfg, err := loadConfig()
	if err != nil {
		fmt.Printf("CONFIG ERROR: %v\n", err)
		return
	}

	ctx := context.Background()
	pool, err := postgres.NewPool(ctx, &cfg.Database)
	if err != nil {
		fmt.Printf("UNREACHABLE: %v\n", err)
	} else {
		if err := pool.Ping(ctx); err != nil {
			fmt.Printf("PING FAILED: %v\n", err)
		} else {
			fmt.Printf("OK (%s:%d/%s)\n", cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)

			// Check schema
			fmt.Print("DB Schema ... ")
			var exists bool
			err := pool.QueryRow(ctx,
				`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'tenancy' AND table_name = 'tenants')`,
			).Scan(&exists)
			if err != nil || !exists {
				fmt.Println("NOT INITIALIZED (run: pdfforge-cli migrate)")
			} else {
				fmt.Println("OK")
			}
		}
		pool.Close()
	}

	// Check Auth
	fmt.Print("Auth ... ")
	if cfg.Auth.JWKSURL == "" {
		fmt.Println("NOT CONFIGURED (will use dummy mode)")
	} else {
		fmt.Printf("OK (JWKS: %s)\n", cfg.Auth.JWKSURL)
	}

	fmt.Printf("\nOS: %s/%s\n", runtime.GOOS, runtime.GOARCH)
}

func runMigrate() {
	fmt.Println("Running migrations...")

	cfg, err := loadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	if err := migrations.Run(&cfg.Database); err != nil {
		fmt.Fprintf(os.Stderr, "migration error: %v\n", err)
		os.Exit(1)
	}
}

func runInit(name string) {
	if _, err := os.Stat(name); err == nil {
		fmt.Fprintf(os.Stderr, "directory %q already exists\n", name)
		os.Exit(1)
	}

	// Use only the base directory name as Go module name (handles absolute/relative paths)
	moduleName := filepath.Base(name)

	dirs := []string{
		name,
		name + "/config",
		name + "/extensions/injectors",
	}
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "error creating %s: %v\n", d, err)
			os.Exit(1)
		}
	}

	files := map[string]string{
		name + "/main.go":                         mainGoTemplate(moduleName),
		name + "/config/app.yaml":                 appYamlTemplate(moduleName),
		name + "/config/injectors.i18n.yaml":      i18nTemplate(moduleName),
		name + "/extensions/injectors/example_value.go":  exampleInjectorTemplate(moduleName),
		name + "/extensions/injectors/example_number.go": exampleNumberInjectorTemplate(moduleName),
		name + "/extensions/injectors/example_bool.go":   exampleBoolInjectorTemplate(moduleName),
		name + "/extensions/injectors/example_time.go":   exampleTimeInjectorTemplate(moduleName),
		name + "/extensions/injectors/example_image.go":  exampleImageInjectorTemplate(moduleName),
		name + "/extensions/injectors/example_table.go":  exampleTableInjectorTemplate(moduleName),
		name + "/extensions/injectors/example_list.go":   exampleListInjectorTemplate(moduleName),
		name + "/extensions/mapper.go":            exampleMapperTemplate(moduleName),
		name + "/extensions/init.go":              exampleInitTemplate(moduleName),
		name + "/docker-compose.yaml":             dockerComposeTemplate(moduleName),
		name + "/Dockerfile":                      dockerfileTemplate(moduleName),
		name + "/Makefile":                        makefileTemplate(moduleName),
		name + "/.env.example":                    envTemplate(moduleName),
	}

	for path, content := range files {
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "error writing %s: %v\n", path, err)
			os.Exit(1)
		}
	}

	// Create go.mod with replace directive pointing to local pdf-forge source
	forgeRoot := findForgeRoot()
	goModContent := fmt.Sprintf("module %s\n\ngo 1.25.1\n\nrequire github.com/rendis/pdf-forge v0.0.0\n", moduleName)
	if forgeRoot != "" {
		goModContent += fmt.Sprintf("\nreplace github.com/rendis/pdf-forge => %s\n", forgeRoot)
	}
	if err := os.WriteFile(name+"/go.mod", []byte(goModContent), 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "error writing go.mod: %v\n", err)
		os.Exit(1)
	}

	// Run go mod tidy to populate go.sum
	tidyCmd := exec.Command("go", "mod", "tidy")
	tidyCmd.Dir = name
	tidyCmd.Stdout = os.Stdout
	tidyCmd.Stderr = os.Stderr
	if err := tidyCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "warning: go mod tidy failed: %v (run manually in project dir)\n", err)
	}

	fmt.Printf("Project %q created successfully!\n\n", name)
	fmt.Println("Next steps:")
	fmt.Printf("  cd %s\n", name)
	fmt.Println("  make fresh           # check prereqs, start PG, build and run")
	fmt.Println()
	fmt.Println("  Open http://localhost:8080 once the server starts.")
	fmt.Println()
	fmt.Println("  make help            # see all available targets")
}

// forgeModuleRoot is set at build time via -ldflags.
// Example: go build -ldflags "-X main.forgeModuleRoot=/path/to/pdf-forge" ./cmd/pdfforge-cli
var forgeModuleRoot string

// findForgeRoot returns the local pdf-forge source directory for use in go.mod replace directives.
// Uses build-time ldflags value, or falls back to runtime detection.
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

func loadConfig() (*config.Config, error) {
	// Try specific path first, then default
	if _, err := os.Stat("config/app.yaml"); err == nil {
		return config.LoadFromFile("config/app.yaml")
	}
	return config.Load()
}

// --- Templates ---

func goHeader(name string) string {
	return fmt.Sprintf("// Code generated by pdfforge-cli init for project %q.\n// pdf-forge: https://github.com/rendis/pdf-forge\n\n", name)
}

func shHeader(name string) string {
	return fmt.Sprintf("# Generated by pdfforge-cli init for project %q.\n# pdf-forge: https://github.com/rendis/pdf-forge\n\n", name)
}

func mainGoTemplate(name string) string {
	return goHeader(name) + fmt.Sprintf(`package main

import (
	"log"

	"github.com/rendis/pdf-forge/sdk"
	"%s/extensions"
	"%s/extensions/injectors"
)

func main() {
	engine := sdk.New(
		sdk.WithConfigFile("config/app.yaml"),
		sdk.WithI18nFile("config/injectors.i18n.yaml"),
	)

	// Register custom injectors (one example per ValueType)
	engine.RegisterInjector(&injectors.ExampleValueInjector{})
	engine.RegisterInjector(&injectors.ExampleNumberInjector{})
	engine.RegisterInjector(&injectors.ExampleBoolInjector{})
	engine.RegisterInjector(&injectors.ExampleTimeInjector{})
	engine.RegisterInjector(&injectors.ExampleImageInjector{})
	engine.RegisterInjector(&injectors.ExampleTableInjector{})
	engine.RegisterInjector(&injectors.ExampleListInjector{})

	// Register mapper (handles request parsing for render)
	engine.RegisterMapper(&extensions.ExampleMapper{})

	// Register init function (loads shared data before injectors)
	engine.SetInitFunc(extensions.ExampleInit())

	// Auto-apply pending database migrations (idempotent)
	if err := engine.RunMigrations(); err != nil {
		log.Fatal("migrations: ", err)
	}

	if err := engine.Run(); err != nil {
		log.Fatal(err)
	}
}
`, name, name)
}

func appYamlTemplate(name string) string {
	return shHeader(name) + `server:
  port: "8080"
  swagger_ui: true
  # read_timeout: 30
  # write_timeout: 30
  # shutdown_timeout: 10

database:
  host: localhost           # Use "postgres" when running inside Docker (profile: full)
  port: 5432
  user: postgres
  password: postgres
  name: pdf_forge
  ssl_mode: disable
  # max_pool_size: 10
  # min_pool_size: 2

# auth:
#   jwks_url: "https://your-keycloak/realms/your-realm/protocol/openid-connect/certs"
#   issuer: "https://your-keycloak/realms/your-realm"
#   audience: "your-client-id"

# internal_api:
#   enabled: true
#   api_key: "your-secret-api-key"

typst:
  bin_path: typst
  timeout_seconds: 10
  # font_dirs: []

# environment: development
`
}

func i18nTemplate(name string) string {
	return shHeader(name) + `# Custom injector i18n translations
# One example per ValueType: value, number, bool, time, image, table, list

groups:
  - key: custom
    name:
      en: "Custom"
      es: "Personalizado"
    icon: "settings"

my_example_value:
  group: custom
  name:
    en: "My Custom Value"
    es: "Mi Valor Personalizado"
  description:
    en: "Custom string injector example"
    es: "Ejemplo de inyector de texto personalizado"

my_example_number:
  group: custom
  name:
    en: "My Custom Number"
    es: "Mi Número Personalizado"
  description:
    en: "Custom number injector example"
    es: "Ejemplo de inyector de número personalizado"

my_example_bool:
  group: custom
  name:
    en: "My Custom Boolean"
    es: "Mi Booleano Personalizado"
  description:
    en: "Custom boolean injector example"
    es: "Ejemplo de inyector booleano personalizado"

my_example_time:
  group: custom
  name:
    en: "My Custom Time"
    es: "Mi Tiempo Personalizado"
  description:
    en: "Custom time injector example"
    es: "Ejemplo de inyector de tiempo personalizado"

my_example_image:
  group: custom
  name:
    en: "My Custom Image"
    es: "Mi Imagen Personalizada"
  description:
    en: "Custom image injector example"
    es: "Ejemplo de inyector de imagen personalizado"

my_example_table:
  group: custom
  name:
    en: "My Custom Table"
    es: "Mi Tabla Personalizada"
  description:
    en: "Custom table injector example"
    es: "Ejemplo de inyector de tabla personalizado"

my_example_list:
  group: custom
  name:
    en: "My Custom List"
    es: "Mi Lista Personalizada"
  description:
    en: "Custom list injector example"
    es: "Ejemplo de inyector de lista personalizado"
`
}

func exampleInjectorTemplate(name string) string {
	return goHeader(name) + `package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleValueInjector demonstrates a string ValueType injector.
type ExampleValueInjector struct{}

func (i *ExampleValueInjector) Code() string { return "my_example_value" }

func (i *ExampleValueInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		v := sdk.StringValue("Hello from " + injCtx.ExternalID())
		return &sdk.InjectorResult{Value: v}, nil
	}, nil // no dependencies
}

func (i *ExampleValueInjector) IsCritical() bool                  { return false }
func (i *ExampleValueInjector) Timeout() time.Duration            { return 0 }
func (i *ExampleValueInjector) DataType() sdk.ValueType           { return sdk.ValueTypeString }
func (i *ExampleValueInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleValueInjector) Formats() *sdk.FormatConfig        { return nil }
`
}

func exampleNumberInjectorTemplate(name string) string {
	return goHeader(name) + `package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleNumberInjector demonstrates a number ValueType injector.
type ExampleNumberInjector struct{}

func (i *ExampleNumberInjector) Code() string { return "my_example_number" }

func (i *ExampleNumberInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		v := sdk.NumberValue(42.5)
		return &sdk.InjectorResult{Value: v}, nil
	}, nil
}

func (i *ExampleNumberInjector) IsCritical() bool                  { return false }
func (i *ExampleNumberInjector) Timeout() time.Duration            { return 0 }
func (i *ExampleNumberInjector) DataType() sdk.ValueType           { return sdk.ValueTypeNumber }
func (i *ExampleNumberInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleNumberInjector) Formats() *sdk.FormatConfig        { return nil }
`
}

func exampleBoolInjectorTemplate(name string) string {
	return goHeader(name) + `package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleBoolInjector demonstrates a boolean ValueType injector.
type ExampleBoolInjector struct{}

func (i *ExampleBoolInjector) Code() string { return "my_example_bool" }

func (i *ExampleBoolInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		v := sdk.BoolValue(true)
		return &sdk.InjectorResult{Value: v}, nil
	}, nil
}

func (i *ExampleBoolInjector) IsCritical() bool                  { return false }
func (i *ExampleBoolInjector) Timeout() time.Duration            { return 0 }
func (i *ExampleBoolInjector) DataType() sdk.ValueType           { return sdk.ValueTypeBool }
func (i *ExampleBoolInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleBoolInjector) Formats() *sdk.FormatConfig        { return nil }
`
}

func exampleTimeInjectorTemplate(name string) string {
	return goHeader(name) + `package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleTimeInjector demonstrates a time ValueType injector.
type ExampleTimeInjector struct{}

func (i *ExampleTimeInjector) Code() string { return "my_example_time" }

func (i *ExampleTimeInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		v := sdk.TimeValue(time.Now())
		return &sdk.InjectorResult{Value: v}, nil
	}, nil
}

func (i *ExampleTimeInjector) IsCritical() bool                  { return false }
func (i *ExampleTimeInjector) Timeout() time.Duration            { return 0 }
func (i *ExampleTimeInjector) DataType() sdk.ValueType           { return sdk.ValueTypeTime }
func (i *ExampleTimeInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleTimeInjector) Formats() *sdk.FormatConfig        { return nil }
`
}

func exampleImageInjectorTemplate(name string) string {
	return goHeader(name) + `package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleImageInjector demonstrates an IMAGE type injectable.
// IMAGE injectables return URLs that are resolved when rendering documents.
type ExampleImageInjector struct{}

func (i *ExampleImageInjector) Code() string { return "my_example_image" }

func (i *ExampleImageInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		return &sdk.InjectorResult{
			Value: sdk.ImageValue("https://picsum.photos/seed/example/400/300"),
		}, nil
	}, nil
}

func (i *ExampleImageInjector) IsCritical() bool                  { return false }
func (i *ExampleImageInjector) Timeout() time.Duration             { return 0 }
func (i *ExampleImageInjector) DataType() sdk.ValueType            { return sdk.ValueTypeImage }
func (i *ExampleImageInjector) DefaultValue() *sdk.InjectableValue {
	v := sdk.ImageValue("https://picsum.photos/400/300")
	return &v
}
func (i *ExampleImageInjector) Formats() *sdk.FormatConfig { return nil }
`
}

func exampleTableInjectorTemplate(name string) string {
	return goHeader(name) + `package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleTableInjector demonstrates a TABLE type injectable.
type ExampleTableInjector struct{}

func (i *ExampleTableInjector) Code() string { return "my_example_table" }

func (i *ExampleTableInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		table := sdk.NewTableValue().
			AddColumn("item", map[string]string{"es": "Item", "en": "Item"}, sdk.ValueTypeString).
			AddColumn("description", map[string]string{"es": "Descripción", "en": "Description"}, sdk.ValueTypeString).
			AddColumn("value", map[string]string{"es": "Valor", "en": "Value"}, sdk.ValueTypeNumber).
			AddRow(
				sdk.Cell(sdk.StringValue("A")),
				sdk.Cell(sdk.StringValue("First example item")),
				sdk.Cell(sdk.NumberValue(100.00)),
			).
			AddRow(
				sdk.Cell(sdk.StringValue("B")),
				sdk.Cell(sdk.StringValue("Second example item")),
				sdk.Cell(sdk.NumberValue(200.00)),
			).
			AddRow(
				sdk.Cell(sdk.StringValue("C")),
				sdk.Cell(sdk.StringValue("Third example item")),
				sdk.Cell(sdk.NumberValue(300.00)),
			).
			WithHeaderStyles(sdk.TableStyles{
				Background: sdk.StringPtr("#f0f0f0"),
				FontWeight: sdk.StringPtr("bold"),
				TextAlign:  sdk.StringPtr("center"),
			})

		return &sdk.InjectorResult{Value: sdk.TableValueData(table)}, nil
	}, nil
}

func (i *ExampleTableInjector) IsCritical() bool                  { return false }
func (i *ExampleTableInjector) Timeout() time.Duration             { return 0 }
func (i *ExampleTableInjector) DataType() sdk.ValueType            { return sdk.ValueTypeTable }
func (i *ExampleTableInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleTableInjector) Formats() *sdk.FormatConfig         { return nil }

// ColumnSchema implements sdk.TableSchemaProvider.
func (i *ExampleTableInjector) ColumnSchema() []sdk.TableColumn {
	return []sdk.TableColumn{
		{Key: "item", Labels: map[string]string{"es": "Item", "en": "Item"}, DataType: sdk.ValueTypeString},
		{Key: "description", Labels: map[string]string{"es": "Descripción", "en": "Description"}, DataType: sdk.ValueTypeString},
		{Key: "value", Labels: map[string]string{"es": "Valor", "en": "Value"}, DataType: sdk.ValueTypeNumber},
	}
}
`
}

func exampleListInjectorTemplate(name string) string {
	return goHeader(name) + `package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleListInjector demonstrates a LIST type injectable.
type ExampleListInjector struct{}

func (i *ExampleListInjector) Code() string { return "my_example_list" }

func (i *ExampleListInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		list := sdk.NewListValue().
			WithSymbol(sdk.ListSymbolBullet).
			WithHeaderLabel(map[string]string{
				"es": "Requisitos del documento",
				"en": "Document Requirements",
			}).
			AddNestedItem(sdk.StringValue("Identification"),
				sdk.ListItemValue(sdk.StringValue("Valid government ID")),
				sdk.ListItemValue(sdk.StringValue("Proof of address")),
			).
			AddNestedItem(sdk.StringValue("Financial Information"),
				sdk.ListItemValue(sdk.StringValue("Last 3 months bank statements")),
				sdk.ListItemNested(sdk.StringValue("Tax return"),
					sdk.ListItemValue(sdk.StringValue("Federal")),
					sdk.ListItemValue(sdk.StringValue("State/Provincial")),
				),
			).
			WithHeaderStyles(sdk.ListStyles{
				FontWeight: sdk.StringPtr("bold"),
				FontSize:   sdk.IntPtr(14),
			})

		return &sdk.InjectorResult{Value: sdk.ListValueData(list)}, nil
	}, nil
}

func (i *ExampleListInjector) IsCritical() bool                  { return false }
func (i *ExampleListInjector) Timeout() time.Duration             { return 0 }
func (i *ExampleListInjector) DataType() sdk.ValueType            { return sdk.ValueTypeList }
func (i *ExampleListInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleListInjector) Formats() *sdk.FormatConfig         { return nil }

// ListSchema implements sdk.ListSchemaProvider.
func (i *ExampleListInjector) ListSchema() sdk.ListSchema {
	return sdk.ListSchema{
		Symbol: sdk.ListSymbolBullet,
		HeaderLabel: map[string]string{
			"es": "Requisitos del documento",
			"en": "Document Requirements",
		},
	}
}
`
}

func exampleMapperTemplate(name string) string {
	return goHeader(name) + `package extensions

import (
	"context"
	"encoding/json"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleMapper parses incoming render requests.
type ExampleMapper struct{}

func (m *ExampleMapper) Map(ctx context.Context, mapCtx *sdk.MapperContext) (any, error) {
	var payload map[string]any
	if err := json.Unmarshal(mapCtx.RawBody, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}
`
}

func exampleInitTemplate(name string) string {
	return goHeader(name) + `package extensions

import (
	"context"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleInit runs once before all injectors on each render request.
func ExampleInit() sdk.InitFunc {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
		// Load shared data here (e.g., from CRM, config service)
		return nil, nil
	}
}
`
}

func dockerComposeTemplate(name string) string {
	return shHeader(name) + `services:
  postgres:
    image: postgres:16
    ports:
      - "${PG_PORT:-5432}:5432"
    environment:
      POSTGRES_DB: pdf_forge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
        required: false
    environment:
      DOC_ENGINE_DATABASE_HOST: ${DOC_ENGINE_DATABASE_HOST:-postgres}
      DOC_ENGINE_DATABASE_PORT: ${DOC_ENGINE_DATABASE_PORT:-5432}
      DOC_ENGINE_DATABASE_USER: ${DOC_ENGINE_DATABASE_USER:-postgres}
      DOC_ENGINE_DATABASE_PASSWORD: ${DOC_ENGINE_DATABASE_PASSWORD:-postgres}
      DOC_ENGINE_DATABASE_NAME: ${DOC_ENGINE_DATABASE_NAME:-pdf_forge}

volumes:
  pgdata:
`
}

func dockerfileTemplate(name string) string {
	return shHeader(name) + `# ---- Build stage ----
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/app .

# ---- Runtime stage ----
FROM alpine:3.21
RUN apk add --no-cache ca-certificates curl xz

# Install Typst (auto-detect architecture: x86_64 / aarch64)
ARG TYPST_VERSION=latest
RUN ARCH=$(uname -m) && \
    case "$ARCH" in \
      x86_64)  TYPST_ARCH="x86_64-unknown-linux-musl" ;; \
      aarch64) TYPST_ARCH="aarch64-unknown-linux-musl" ;; \
      *)       echo "Unsupported architecture: $ARCH" && exit 1 ;; \
    esac && \
    curl -fsSL "https://github.com/typst/typst/releases/${TYPST_VERSION}/download/typst-${TYPST_ARCH}.tar.xz" \
      | tar xJ --strip-components=1 -C /usr/local/bin/ && \
    typst --version

COPY --from=builder /bin/app /bin/app
COPY config/ /app/config/
WORKDIR /app
EXPOSE 8080
CMD ["/bin/app"]
`
}

func makefileTemplate(name string) string {
	return shHeader(name) + `.PHONY: fresh check up up-db down build run migrate logs clean dev test fmt lint help

# Load .env if exists
-include .env
export

# Resolve PostgreSQL port:
# 1. PG_PORT env/arg if set explicitly
# 2. Port from running container (for "make run" after "make up-db")
# 3. First free port from 5432-5434 (for starting new container)
RESOLVED_PG_PORT := $(or $(PG_PORT),$(shell \
  docker port ` + name + `-postgres-1 5432 2>/dev/null | head -1 | grep -o '[0-9]*$$' || \
  ( for p in 5432 5433 5434; do \
      if ! lsof -iTCP:$$p -sTCP:LISTEN -t >/dev/null 2>&1; then echo $$p; exit 0; fi; \
    done; echo 5432 ) ))

## fresh: Full reset — clean DB, start PG, build and run (recommended for first run)
fresh: check clean up-db _wait-pg build
	@echo "» Starting app on http://localhost:8080"
	@DOC_ENGINE_DATABASE_PORT=$(RESOLVED_PG_PORT) ./bin/app

## check: Verify prerequisites (Docker, Typst, Go)
check:
	@echo "» Checking prerequisites..."
	@command -v docker >/dev/null 2>&1 || { echo "  ✗ Docker not found — install from https://docs.docker.com/get-docker/"; exit 1; }
	@command -v typst >/dev/null 2>&1 || { echo "  ✗ Typst not found — install: brew install typst (macOS) or cargo install typst-cli"; exit 1; }
	@command -v go >/dev/null 2>&1 || { echo "  ✗ Go not found — install from https://go.dev/dl/"; exit 1; }
	@echo "  ✓ All OK"

_wait-pg:
	@printf "» Waiting for PostgreSQL"
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
	  docker exec $$(docker compose ps -q postgres 2>/dev/null) pg_isready -U postgres >/dev/null 2>&1 && printf " ready\n" && exit 0 || printf "." && sleep 1; \
	done; echo " timeout (check docker logs)" && exit 1

## up: Start app + PostgreSQL (full containerized)
up:
	@echo "» PostgreSQL port: $(RESOLVED_PG_PORT)"
	PG_PORT=$(RESOLVED_PG_PORT) docker compose up --build -d

## up-db: Start only PostgreSQL
up-db:
	@echo "» PostgreSQL port: $(RESOLVED_PG_PORT)"
	PG_PORT=$(RESOLVED_PG_PORT) docker compose up postgres -d

## down: Stop all containers
down:
	docker compose down

## logs: Tail container logs
logs:
	docker compose logs -f

## clean: Stop containers, remove volumes
clean:
	docker compose down -v

# Local development

## build: Build the Go binary
build:
	go build -o bin/app .

## run: Build and run locally (requires PG running)
run: build
	DOC_ENGINE_DATABASE_PORT=$(RESOLVED_PG_PORT) ./bin/app

## migrate: Apply database migrations
migrate:
	@command -v pdfforge-cli >/dev/null 2>&1 && pdfforge-cli migrate || go run github.com/rendis/pdf-forge/cmd/pdfforge-cli migrate

## dev: Run with hot reload (requires air: go install github.com/air-verse/air@latest)
dev:
	air

## test: Run tests
test:
	go test -race ./...

## fmt: Format Go source files
fmt:
	gofmt -w .

## lint: Run linter (requires golangci-lint)
lint:
	golangci-lint run ./...

## help: Show this help
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Quick start:"
	@echo "  fresh     Full reset: check prereqs, clean DB, start PG, build and run"
	@echo "  check     Verify prerequisites (Docker, Typst, Go)"
	@echo ""
	@echo "Docker:"
	@echo "  up        Start app + PostgreSQL (full containerized)"
	@echo "  up-db     Start only PostgreSQL (for local dev)"
	@echo "  down      Stop all containers"
	@echo "  logs      Tail container logs"
	@echo "  clean     Stop containers, remove volumes"
	@echo ""
	@echo "Local development:"
	@echo "  build     Build the Go binary"
	@echo "  run       Build and run locally"
	@echo "  migrate   Apply database migrations"
	@echo "  dev       Run with hot reload (requires air)"
	@echo "  test      Run tests"
	@echo "  fmt       Format Go source files"
	@echo "  lint      Run linter (requires golangci-lint)"
	@echo ""
	@echo "Configuration:"
	@echo "  PG_PORT=5433 make up    Use custom PostgreSQL port (auto-detected: $(RESOLVED_PG_PORT))"
	@echo "  Copy .env.example to .env to customize settings"
`
}

func envTemplate(name string) string {
	return shHeader(name) + `# Database (override to use an external PostgreSQL instead of the bundled one)
DOC_ENGINE_DATABASE_HOST=localhost
DOC_ENGINE_DATABASE_PORT=5432
DOC_ENGINE_DATABASE_USER=postgres
DOC_ENGINE_DATABASE_PASSWORD=postgres
DOC_ENGINE_DATABASE_NAME=pdf_forge

# Server
DOC_ENGINE_SERVER_PORT=8080

# Auth (omit for dummy mode)
# DOC_ENGINE_AUTH_JWKS_URL=
# DOC_ENGINE_AUTH_ISSUER=
# DOC_ENGINE_AUTH_AUDIENCE=

# Typst
DOC_ENGINE_TYPST_BIN_PATH=typst
`
}
