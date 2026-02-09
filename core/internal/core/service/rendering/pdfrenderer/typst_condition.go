package pdfrenderer

import (
	"fmt"
	"strings"

	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
)

// evaluateCondition and all comparison logic is identical to NodeConverter.
func (c *TypstConverter) evaluateCondition(attrs map[string]any) bool {
	conditionsRaw, ok := attrs["conditions"]
	if !ok {
		return true
	}
	conditionsMap, ok := conditionsRaw.(map[string]any)
	if !ok {
		return true
	}
	return c.evaluateLogicGroup(conditionsMap)
}

func (c *TypstConverter) evaluateLogicGroup(group map[string]any) bool {
	logic, _ := group["logic"].(string)
	childrenRaw, _ := group["children"].([]any)

	if len(childrenRaw) == 0 {
		return true
	}

	for _, childRaw := range childrenRaw {
		child, ok := childRaw.(map[string]any)
		if !ok {
			continue
		}

		result := c.evaluateChild(child)

		if logic == portabledoc.LogicAND && !result {
			return false
		}
		if logic == portabledoc.LogicOR && result {
			return true
		}
	}

	return logic == portabledoc.LogicAND
}

func (c *TypstConverter) evaluateChild(child map[string]any) bool {
	childType, _ := child["type"].(string)
	switch childType {
	case portabledoc.LogicTypeGroup:
		return c.evaluateLogicGroup(child)
	case portabledoc.LogicTypeRule:
		return c.evaluateRule(child)
	default:
		return false
	}
}

func (c *TypstConverter) evaluateRule(rule map[string]any) bool {
	variableID, _ := rule["variableId"].(string)
	operator, _ := rule["operator"].(string)
	valueObj, _ := rule["value"].(map[string]any)

	actualValue := c.injectables[variableID]
	compareValue := c.resolveCompareValue(valueObj)

	return c.compareValues(actualValue, compareValue, operator)
}

func (c *TypstConverter) resolveCompareValue(valueObj map[string]any) any {
	valueMode, _ := valueObj["mode"].(string)
	compareValue := valueObj["value"]

	if valueMode == portabledoc.RuleModeVariable {
		compareVarID, _ := compareValue.(string)
		return c.injectables[compareVarID]
	}
	return compareValue
}

func (c *TypstConverter) compareValues(actual, compare any, operator string) bool {
	actualStr := fmt.Sprintf("%v", actual)
	compareStr := fmt.Sprintf("%v", compare)

	if result, ok := c.compareStringOps(actualStr, compareStr, actual, operator); ok {
		return result
	}
	return c.compareNumericOps(actual, compare, operator)
}

func (c *TypstConverter) compareStringOps(actualStr, compareStr string, actual any, operator string) (bool, bool) {
	switch operator {
	case portabledoc.OpEqual:
		return actualStr == compareStr, true
	case portabledoc.OpNotEqual:
		return actualStr != compareStr, true
	case portabledoc.OpEmpty:
		return actual == nil || actualStr == "", true
	case portabledoc.OpNotEmpty:
		return actual != nil && actualStr != "", true
	case portabledoc.OpStartsWith:
		return strings.HasPrefix(actualStr, compareStr), true
	case portabledoc.OpEndsWith:
		return strings.HasSuffix(actualStr, compareStr), true
	case portabledoc.OpContains:
		return strings.Contains(actualStr, compareStr), true
	case portabledoc.OpIsTrue:
		return actualStr == "true" || actualStr == "1", true
	case portabledoc.OpIsFalse:
		return actualStr == "false" || actualStr == "0" || actualStr == "", true
	default:
		return false, false
	}
}

func (c *TypstConverter) compareNumericOps(actual, compare any, operator string) bool {
	switch operator {
	case portabledoc.OpGreater, portabledoc.OpAfter:
		return c.compareNumeric(actual, compare) > 0
	case portabledoc.OpLess, portabledoc.OpBefore:
		return c.compareNumeric(actual, compare) < 0
	case portabledoc.OpGreaterEq:
		return c.compareNumeric(actual, compare) >= 0
	case portabledoc.OpLessEq:
		return c.compareNumeric(actual, compare) <= 0
	default:
		return false
	}
}

func (c *TypstConverter) compareNumeric(a, b any) int {
	aNum := toFloat64(a)
	bNum := toFloat64(b)

	if aNum < bNum {
		return -1
	}
	if aNum > bNum {
		return 1
	}
	return 0
}
