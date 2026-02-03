package templates

import (
	"bytes"
	"strings"
	"testing"
)

func TestTemplatesNotNil(t *testing.T) {
	if Templates == nil {
		t.Fatal("Templates is nil")
	}
}

func TestAllTemplatesExist(t *testing.T) {
	expectedTemplates := []string{
		"main.go.tmpl",
		"go.mod.tmpl",
		"app.yaml.tmpl",
		"i18n.yaml.tmpl",
		"init.go.tmpl",
		"mapper.go.tmpl",
		"middleware.go.tmpl",
		"example_value.go.tmpl",
		"example_number.go.tmpl",
		"example_bool.go.tmpl",
		"example_time.go.tmpl",
		"example_image.go.tmpl",
		"example_table.go.tmpl",
		"example_list.go.tmpl",
		"docker-compose.yaml.tmpl",
		"Dockerfile.tmpl",
		"Makefile.tmpl",
		"env.tmpl",
	}

	for _, name := range expectedTemplates {
		t.Run(name, func(t *testing.T) {
			tmpl := Templates.Lookup(name)
			if tmpl == nil {
				t.Errorf("template %s not found", name)
			}
		})
	}
}

func TestTemplateCount(t *testing.T) {
	// Should have at least 18 templates
	templates := Templates.Templates()
	if len(templates) < 18 {
		t.Errorf("expected at least 18 templates, got %d", len(templates))
	}
}

func TestTemplateRender_MainGo(t *testing.T) {
	tmpl := Templates.Lookup("main.go.tmpl")
	if tmpl == nil {
		t.Fatal("main.go.tmpl not found")
	}

	data := Data{
		ProjectName: "test-project",
		ModuleName:  "github.com/test/test-project",
		GoVersion:   "1.21",
		ForgeRoot:   "/path/to/forge",
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		t.Fatalf("failed to execute template: %v", err)
	}

	result := buf.String()

	// Should contain package main
	if !strings.Contains(result, "package main") {
		t.Error("rendered template should contain 'package main'")
	}

	// Should contain pdf-forge import
	if !strings.Contains(result, "pdf-forge") {
		t.Error("rendered template should contain 'pdf-forge'")
	}
}

func TestTemplateRender_GoMod(t *testing.T) {
	tmpl := Templates.Lookup("go.mod.tmpl")
	if tmpl == nil {
		t.Fatal("go.mod.tmpl not found")
	}

	data := Data{
		ProjectName: "test-project",
		ModuleName:  "github.com/test/test-project",
		GoVersion:   "1.21",
		ForgeRoot:   "/path/to/forge",
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		t.Fatalf("failed to execute template: %v", err)
	}

	result := buf.String()

	// Should contain module declaration
	if !strings.Contains(result, "module github.com/test/test-project") {
		t.Error("rendered template should contain module declaration")
	}

	// Should contain go version
	if !strings.Contains(result, "go 1.21") {
		t.Error("rendered template should contain go version")
	}
}

func TestTemplateRender_AppYaml(t *testing.T) {
	tmpl := Templates.Lookup("app.yaml.tmpl")
	if tmpl == nil {
		t.Fatal("app.yaml.tmpl not found")
	}

	data := Data{
		ProjectName: "test-project",
		ModuleName:  "github.com/test/test-project",
		GoVersion:   "1.21",
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		t.Fatalf("failed to execute template: %v", err)
	}

	result := buf.String()

	// Should be valid YAML-like content
	if len(result) == 0 {
		t.Error("rendered template is empty")
	}
}

func TestTemplateRender_Dockerfile(t *testing.T) {
	tmpl := Templates.Lookup("Dockerfile.tmpl")
	if tmpl == nil {
		t.Fatal("Dockerfile.tmpl not found")
	}

	data := Data{
		ProjectName: "test-project",
		ModuleName:  "github.com/test/test-project",
		GoVersion:   "1.21",
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		t.Fatalf("failed to execute template: %v", err)
	}

	result := buf.String()

	// Should contain FROM
	if !strings.Contains(result, "FROM") {
		t.Error("Dockerfile should contain FROM")
	}
}

func TestTemplateRender_Makefile(t *testing.T) {
	tmpl := Templates.Lookup("Makefile.tmpl")
	if tmpl == nil {
		t.Fatal("Makefile.tmpl not found")
	}

	data := Data{
		ProjectName: "test-project",
		ModuleName:  "github.com/test/test-project",
		GoVersion:   "1.21",
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		t.Fatalf("failed to execute template: %v", err)
	}

	result := buf.String()

	// Should contain targets
	if !strings.Contains(result, ":") {
		t.Error("Makefile should contain targets")
	}
}

func TestGoHeader(t *testing.T) {
	header := GoHeader("my-project")

	if !strings.Contains(header, "my-project") {
		t.Error("header should contain project name")
	}

	if !strings.Contains(header, "pdf-forge") {
		t.Error("header should contain pdf-forge reference")
	}

	if !strings.HasPrefix(header, "//") {
		t.Error("Go header should start with //")
	}
}

func TestShHeader(t *testing.T) {
	header := ShHeader("my-project")

	if !strings.Contains(header, "my-project") {
		t.Error("header should contain project name")
	}

	if !strings.Contains(header, "pdf-forge") {
		t.Error("header should contain pdf-forge reference")
	}

	if !strings.HasPrefix(header, "#") {
		t.Error("Shell header should start with #")
	}
}

func TestData_AllFieldsUsed(t *testing.T) {
	data := Data{
		ProjectName: "test-project",
		ModuleName:  "github.com/test/test-project",
		GoVersion:   "1.21",
		ForgeRoot:   "/path/to/forge",
	}

	// Verify all fields are accessible
	if data.ProjectName != "test-project" {
		t.Error("ProjectName not accessible")
	}
	if data.ModuleName != "github.com/test/test-project" {
		t.Error("ModuleName not accessible")
	}
	if data.GoVersion != "1.21" {
		t.Error("GoVersion not accessible")
	}
	if data.ForgeRoot != "/path/to/forge" {
		t.Error("ForgeRoot not accessible")
	}
}

func TestTemplateRender_ExampleInjectors(t *testing.T) {
	exampleTemplates := []string{
		"example_value.go.tmpl",
		"example_number.go.tmpl",
		"example_bool.go.tmpl",
		"example_time.go.tmpl",
		"example_image.go.tmpl",
		"example_table.go.tmpl",
		"example_list.go.tmpl",
	}

	data := Data{
		ProjectName: "test-project",
		ModuleName:  "github.com/test/test-project",
		GoVersion:   "1.21",
	}

	for _, name := range exampleTemplates {
		t.Run(name, func(t *testing.T) {
			tmpl := Templates.Lookup(name)
			if tmpl == nil {
				t.Fatalf("template %s not found", name)
			}

			var buf bytes.Buffer
			if err := tmpl.Execute(&buf, data); err != nil {
				t.Fatalf("failed to execute template: %v", err)
			}

			result := buf.String()

			// Should be valid Go code
			if !strings.Contains(result, "package") {
				t.Error("example injector should contain package declaration")
			}
		})
	}
}
