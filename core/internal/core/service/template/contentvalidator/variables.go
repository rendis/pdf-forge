package contentvalidator

import (
	"fmt"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
)

// validateVariables validates all variables and injectors in the document.
func (s *Service) validateVariables(vctx *validationContext) {
	// Validate that declared variables are accessible
	validateDeclaredVariables(vctx)

	// Validate injector nodes in content
	validateInjectorNodes(vctx)
}

// validateDeclaredVariables validates that all declared variableIds are accessible.
func validateDeclaredVariables(vctx *validationContext) {
	if vctx.accessibleInjectables.Len() == 0 {
		// Skip if we couldn't load accessible injectables
		return
	}

	for i, varID := range vctx.doc.VariableIDs {
		path := fmt.Sprintf("variableIds[%d]", i)

		// Check if variable is accessible to workspace
		if !vctx.accessibleInjectables.Contains(varID) {
			vctx.addErrorf(ErrCodeInaccessibleVariable, path,
				"Variable '%s' is not accessible to this workspace", varID)
		}
	}
}

// validateInjectorNodes validates all injector nodes in the document content.
func validateInjectorNodes(vctx *validationContext) {
	doc := vctx.doc

	// Collect all injector nodes
	for i, node := range doc.NodesOfType(portabledoc.NodeTypeInjector) {
		path := fmt.Sprintf("content.injector[%d]", i)
		validateInjectorNode(vctx, node, path)
	}
}

// validateInjectorNode validates a single injector node.
func validateInjectorNode(vctx *validationContext, node portabledoc.Node, path string) {
	attrs, err := portabledoc.ParseInjectorAttrs(node.Attrs)
	if err != nil {
		vctx.addErrorf(ErrCodeInvalidInjectorType, path+".attrs",
			"Invalid injector attributes: %s", err.Error())
		return
	}

	// Validate injector type
	if !portabledoc.ValidInjectorTypes.Contains(attrs.Type) {
		vctx.addErrorf(ErrCodeInvalidInjectorType, path+".attrs.type",
			"Invalid injector type: %s", attrs.Type)
	}

	// Validate variableId
	if attrs.VariableID == "" {
		vctx.addError(ErrCodeUnknownVariable, path+".attrs.variableId",
			"Injector variableId is required")
		return
	}

	// Variable must be in variableIds and in variableSet
	if !vctx.variableSet.Contains(attrs.VariableID) {
		vctx.addErrorf(ErrCodeUnknownVariable, path+".attrs.variableId",
			"Variable '%s' not found in document variableIds", attrs.VariableID)
	}
}

// extractInjectables builds the list of TemplateVersionInjectable from the validated document.
// It matches declared variableIDs against the accessible injectable definitions.
func extractInjectables(vctx *validationContext) []*entity.TemplateVersionInjectable {
	if len(vctx.doc.VariableIDs) == 0 || len(vctx.accessibleInjectableList) == 0 {
		return nil
	}

	// Build a lookup map: injectable key -> definition
	keyToInj := make(map[string]*entity.InjectableDefinition, len(vctx.accessibleInjectableList))
	for _, inj := range vctx.accessibleInjectableList {
		keyToInj[inj.Key] = inj
	}

	var result []*entity.TemplateVersionInjectable
	for _, varID := range vctx.doc.VariableIDs {
		inj, ok := keyToInj[varID]
		if !ok {
			continue
		}
		var tvi *entity.TemplateVersionInjectable
		if inj.IsGlobal() || inj.SourceType == entity.InjectableSourceTypeExternal {
			tvi = entity.NewTemplateVersionInjectableFromSystemKey(vctx.versionID, inj.Key)
		} else {
			tvi = entity.NewTemplateVersionInjectable(vctx.versionID, inj.ID, false, nil)
		}
		result = append(result, tvi)
	}

	return result
}
