package contentvalidator

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
	injectableuc "github.com/rendis/pdf-forge/core/internal/core/usecase/injectable"
)

type injectableUCStub struct {
	injectables []*entity.InjectableDefinition
}

func (s injectableUCStub) GetInjectable(context.Context, string) (*entity.InjectableDefinition, error) {
	return nil, nil
}

func (s injectableUCStub) ListInjectables(context.Context, *injectableuc.ListInjectablesRequest) (*injectableuc.ListInjectablesResult, error) {
	return &injectableuc.ListInjectablesResult{Injectables: s.injectables}, nil
}

func mustMarshalDoc(t *testing.T, doc *portabledoc.Document) []byte {
	t.Helper()
	data, err := json.Marshal(doc)
	if err != nil {
		t.Fatalf("marshal document: %v", err)
	}
	return data
}

func baseDoc() *portabledoc.Document {
	return &portabledoc.Document{
		Version: portabledoc.CurrentVersion,
		Meta: portabledoc.Meta{
			Title:    "Ficha",
			Language: portabledoc.LanguageSpanish,
		},
		PageConfig: portabledoc.PageConfig{
			FormatID: portabledoc.PageFormatA4,
			Width:    595,
			Height:   842,
			Margins:  portabledoc.Margins{Top: 72, Bottom: 72, Left: 72, Right: 72},
		},
		Content: &portabledoc.ProseMirrorDoc{Type: "doc"},
		ExportInfo: portabledoc.ExportInfo{
			ExportedAt: "2026-03-29T00:00:00Z",
			SourceApp:  "pdf-forge-test",
		},
	}
}

func TestValidateForPublish_RejectsUnknownImageInjectablesInBodyAndHeader(t *testing.T) {
	t.Parallel()

	doc := baseDoc()
	doc.Content.Content = []portabledoc.Node{{
		Type:  portabledoc.NodeTypeCustomImage,
		Attrs: map[string]any{"injectableId": "body_logo"},
	}}
	doc.Header = &portabledoc.DocumentHeader{
		Enabled:           true,
		Layout:            portabledoc.HeaderLayoutImageLeft,
		ImageInjectableID: "header_logo",
	}

	result := New(nil).ValidateForPublish(context.Background(), "ws-1", "ver-1", mustMarshalDoc(t, doc))

	if result.Valid {
		t.Fatalf("expected validation to fail, got valid result")
	}
	if len(result.Errors) != 2 {
		t.Fatalf("expected 2 errors, got %d: %+v", len(result.Errors), result.Errors)
	}

	assertError := func(path string) {
		t.Helper()
		for _, err := range result.Errors {
			if err.Code == ErrCodeUnknownVariable && err.Path == path {
				return
			}
		}
		t.Fatalf("expected UNKNOWN_VARIABLE at %s, got %+v", path, result.Errors)
	}

	assertError("content.customImage[0].attrs.injectableId")
	assertError("header.imageInjectableId")
}

func TestValidateForPublish_RejectsUndeclaredInjectorInHeaderContent(t *testing.T) {
	t.Parallel()

	doc := baseDoc()
	doc.VariableIDs = []string{}
	doc.Header = &portabledoc.DocumentHeader{
		Enabled: true,
		Layout:  portabledoc.HeaderLayoutImageLeft,
		Content: &portabledoc.ProseMirrorDoc{
			Type: "doc",
			Content: []portabledoc.Node{
				{
					Type: "paragraph",
					Content: []portabledoc.Node{
						{
							Type:  portabledoc.NodeTypeInjector,
							Attrs: map[string]any{"variableId": "greeting", "type": portabledoc.InjectorTypeText},
						},
					},
				},
			},
		},
	}

	result := New(nil).ValidateForPublish(context.Background(), "ws-1", "ver-1", mustMarshalDoc(t, doc))

	if result.Valid {
		t.Fatalf("expected validation to fail, got valid result")
	}

	for _, err := range result.Errors {
		if err.Code == ErrCodeUnknownVariable && err.Path == "header.content.injector[0].attrs.variableId" {
			return
		}
	}
	t.Fatalf("expected UNKNOWN_VARIABLE at header.content.injector[0].attrs.variableId, got %+v", result.Errors)
}

func TestValidateForPublish_AcceptsAndExtractsDeclaredInjectorInHeaderContent(t *testing.T) {
	t.Parallel()

	workspaceID := "ws-1"
	greetingInj := entity.NewInjectableDefinition(&workspaceID, "greeting", "Greeting", entity.InjectableDataTypeText)
	greetingInj.ID = "inj-greeting"
	greetingInj.SourceType = entity.InjectableSourceTypeInternal

	doc := baseDoc()
	doc.VariableIDs = []string{"greeting"}
	doc.Header = &portabledoc.DocumentHeader{
		Enabled: true,
		Layout:  portabledoc.HeaderLayoutImageLeft,
		Content: &portabledoc.ProseMirrorDoc{
			Type: "doc",
			Content: []portabledoc.Node{
				{
					Type: "paragraph",
					Content: []portabledoc.Node{
						{
							Type:  portabledoc.NodeTypeInjector,
							Attrs: map[string]any{"variableId": "greeting", "type": portabledoc.InjectorTypeText},
						},
					},
				},
			},
		},
	}

	service := New(injectableUCStub{injectables: []*entity.InjectableDefinition{greetingInj}})
	result := service.ValidateForPublish(context.Background(), workspaceID, "ver-1", mustMarshalDoc(t, doc))

	if !result.Valid {
		t.Fatalf("expected validation success, got errors: %+v", result.Errors)
	}
	if len(result.ExtractedInjectables) != 1 {
		t.Fatalf("expected 1 extracted injectable, got %d: %+v", len(result.ExtractedInjectables), result.ExtractedInjectables)
	}
	inj := result.ExtractedInjectables[0]
	if inj.InjectableDefinitionID == nil || *inj.InjectableDefinitionID != "inj-greeting" {
		t.Fatalf("expected extracted injectable with ID inj-greeting, got %+v", inj)
	}
}

func TestValidateForPublish_ExtractsInjectablesUsedOnlyByImagesAndHeader(t *testing.T) {
	t.Parallel()

	workspaceID := "ws-1"
	bodyInj := entity.NewInjectableDefinition(&workspaceID, "body_logo", "Body Logo", entity.InjectableDataTypeImage)
	bodyInj.ID = "inj-body"
	bodyInj.SourceType = entity.InjectableSourceTypeInternal

	headerInj := entity.NewInjectableDefinition(nil, "header_logo", "Header Logo", entity.InjectableDataTypeImage)
	headerInj.SourceType = entity.InjectableSourceTypeExternal

	doc := baseDoc()
	doc.VariableIDs = []string{"body_logo", "header_logo"}
	doc.Content.Content = []portabledoc.Node{{
		Type:  portabledoc.NodeTypeImage,
		Attrs: map[string]any{"injectableId": "body_logo"},
	}}
	doc.Header = &portabledoc.DocumentHeader{
		Enabled:           true,
		Layout:            portabledoc.HeaderLayoutImageRight,
		ImageInjectableID: "header_logo",
	}

	service := New(injectableUCStub{injectables: []*entity.InjectableDefinition{bodyInj, headerInj}})
	result := service.ValidateForPublish(context.Background(), workspaceID, "ver-1", mustMarshalDoc(t, doc))

	if !result.Valid {
		t.Fatalf("expected validation success, got errors: %+v", result.Errors)
	}
	if len(result.ExtractedInjectables) != 2 {
		t.Fatalf("expected 2 extracted injectables, got %d", len(result.ExtractedInjectables))
	}

	var foundBody, foundHeader bool
	for _, inj := range result.ExtractedInjectables {
		if inj.InjectableDefinitionID != nil && *inj.InjectableDefinitionID == "inj-body" {
			foundBody = true
		}
		if inj.SystemInjectableKey != nil && *inj.SystemInjectableKey == "header_logo" {
			foundHeader = true
		}
	}

	if !foundBody {
		t.Fatalf("expected workspace image injectable to be extracted: %+v", result.ExtractedInjectables)
	}
	if !foundHeader {
		t.Fatalf("expected system/external header injectable to be extracted: %+v", result.ExtractedInjectables)
	}
}
