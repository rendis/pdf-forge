// Package contentvalidator provides content structure validation for template versions.
package contentvalidator

import "strings"

// Error codes for content validation.
// These codes are returned in ValidationError.Code to identify specific validation failures.
const (
	// Parse errors
	ErrCodeInvalidJSON  = "INVALID_JSON"
	ErrCodeEmptyContent = "EMPTY_CONTENT"

	// Structure errors
	ErrCodeInvalidVersion    = "INVALID_VERSION_FORMAT"
	ErrCodeMissingMetaTitle  = "MISSING_META_TITLE"
	ErrCodeInvalidLanguage   = "INVALID_LANGUAGE"
	ErrCodeInvalidPageFormat = "INVALID_PAGE_FORMAT"
	ErrCodeInvalidPageSize   = "INVALID_PAGE_SIZE"
	ErrCodeInvalidMargins    = "INVALID_MARGINS"

	ErrCodeInaccessibleInjectable = "INACCESSIBLE_INJECTABLE"

	// Variable errors
	ErrCodeUnknownVariable      = "UNKNOWN_VARIABLE"
	ErrCodeInaccessibleVariable = "INACCESSIBLE_VARIABLE"
	ErrCodeOrphanedVariable     = "ORPHANED_VARIABLE"
	ErrCodeInvalidInjectorType  = "INVALID_INJECTOR_TYPE"

	// Conditional errors
	ErrCodeInvalidConditionVar   = "UNKNOWN_VARIABLE_IN_CONDITION"
	ErrCodeInvalidOperator       = "INVALID_OPERATOR"
	ErrCodeInvalidLogicOperator  = "INVALID_LOGIC_OPERATOR"
	ErrCodeExpressionSyntax      = "EXPRESSION_SYNTAX_ERROR"
	ErrCodeMaxNestingExceeded    = "MAX_NESTING_EXCEEDED"
	ErrCodeInvalidRuleValueMode  = "INVALID_RULE_VALUE_MODE"
	ErrCodeInvalidConditionAttrs = "INVALID_CONDITION_ATTRS"
	ErrCodeEmptyConditionGroup   = "EMPTY_CONDITION_GROUP"
	ErrCodeMissingConditionValue = "MISSING_CONDITION_VALUE"

	// Context errors
	ErrCodeValidationCancelled = "VALIDATION_CANCELLED"
)

// Warning codes for content validation.
// These codes are returned in ValidationWarning.Code for non-blocking issues.
const (
	WarnCodeDeprecatedVersion = "DEPRECATED_VERSION"
	WarnCodeExpressionWarning = "EXPRESSION_WARNING"
	WarnCodeUnusedVariable    = "UNUSED_VARIABLE"
)

// sanitizeJSONError converts raw JSON parse errors to user-friendly messages.
// Removes internal implementation details like Go types.
func sanitizeJSONError(err error) string {
	if err == nil {
		return "Document structure is invalid"
	}

	errStr := err.Error()

	// Handle common JSON error patterns
	switch {
	case strings.Contains(errStr, "cannot unmarshal"):
		if strings.Contains(errStr, "cannot unmarshal array") {
			return "Expected an object but received an array"
		}
		if strings.Contains(errStr, "cannot unmarshal string") {
			return "Received a string where a different type was expected"
		}
		if strings.Contains(errStr, "cannot unmarshal number") {
			return "Received a number where a different type was expected"
		}
		if strings.Contains(errStr, "cannot unmarshal object") {
			return "Received an object where a different type was expected"
		}
		return "Invalid data type in document structure"

	case strings.Contains(errStr, "unexpected end of JSON"):
		return "Document is incomplete or truncated"

	case strings.Contains(errStr, "invalid character"):
		return "Document contains invalid characters or syntax errors"

	case strings.Contains(errStr, "looking for beginning of"):
		return "Document has an unexpected structure"

	default:
		return "Document structure is invalid"
	}
}
