package portabledoc

// LogicGroup represents a group of conditions.
type LogicGroup struct {
	ID       string `json:"id"`
	Type     string `json:"type"`  // always "group"
	Logic    string `json:"logic"` // "AND" | "OR"
	Children []any  `json:"children"`
}

// LogicRule represents a single condition rule.
type LogicRule struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"` // always "rule"
	VariableID string    `json:"variableId"`
	Operator   string    `json:"operator"`
	Value      RuleValue `json:"value"`
}

// RuleValue represents the value in a rule.
type RuleValue struct {
	Mode  string `json:"mode"` // "text" | "variable"
	Value string `json:"value"`
}

// ConditionalAttrs represents conditional block attributes.
type ConditionalAttrs struct {
	Conditions LogicGroup `json:"conditions"`
	Expression string     `json:"expression"`
}

// Logic type constants.
const (
	LogicTypeGroup = "group"
	LogicTypeRule  = "rule"
)

// Logic operator constants.
const (
	LogicAND = "AND"
	LogicOR  = "OR"
)

// ValidLogicOperators contains allowed logic operators.
var ValidLogicOperators = Set[string]{
	LogicAND: {},
	LogicOR:  {},
}

// Rule value mode constants.
const (
	RuleModeText     = "text"
	RuleModeVariable = "variable"
)

// ValidRuleModes contains allowed rule value modes.
var ValidRuleModes = Set[string]{
	RuleModeText:     {},
	RuleModeVariable: {},
}

// Comparison operator constants.
const (
	OpEqual      = "eq"
	OpNotEqual   = "neq"
	OpEmpty      = "empty"
	OpNotEmpty   = "not_empty"
	OpStartsWith = "starts_with"
	OpEndsWith   = "ends_with"
	OpContains   = "contains"
	OpGreater    = "gt"
	OpLess       = "lt"
	OpGreaterEq  = "gte"
	OpLessEq     = "lte"
	OpBefore     = "before"
	OpAfter      = "after"
	OpIsTrue     = "is_true"
	OpIsFalse    = "is_false"
)

// ValidOperators contains all valid comparison operators.
var ValidOperators = Set[string]{
	OpEqual:      {},
	OpNotEqual:   {},
	OpEmpty:      {},
	OpNotEmpty:   {},
	OpStartsWith: {},
	OpEndsWith:   {},
	OpContains:   {},
	OpGreater:    {},
	OpLess:       {},
	OpGreaterEq:  {},
	OpLessEq:     {},
	OpBefore:     {},
	OpAfter:      {},
	OpIsTrue:     {},
	OpIsFalse:    {},
}

// NoValueOperators are operators that don't require a value.
var NoValueOperators = Set[string]{
	OpEmpty:    {},
	OpNotEmpty: {},
	OpIsTrue:   {},
	OpIsFalse:  {},
}

// MaxNestingDepth is the maximum allowed nesting depth for condition groups.
const MaxNestingDepth = 3
