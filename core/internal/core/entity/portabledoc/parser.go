package portabledoc

import "encoding/json"

// Parse parses JSON into Document.
// Returns nil, nil if data is empty.
func Parse(data json.RawMessage) (*Document, error) {
	if len(data) == 0 {
		return nil, nil
	}

	var doc Document
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, err
	}

	return &doc, nil
}

// MustParse parses JSON into Document, panics on error.
// Useful for tests and initialization with known-good data.
func MustParse(data json.RawMessage) *Document {
	doc, err := Parse(data)
	if err != nil {
		panic(err)
	}
	return doc
}

// ParseConditionalAttrs parses node attrs into ConditionalAttrs.
func ParseConditionalAttrs(attrs map[string]any) (*ConditionalAttrs, error) {
	data, err := json.Marshal(attrs)
	if err != nil {
		return nil, err
	}

	var ca ConditionalAttrs
	if err := json.Unmarshal(data, &ca); err != nil {
		return nil, err
	}

	return &ca, nil
}

// ParseInjectorAttrs parses node attrs into InjectorAttrs.
func ParseInjectorAttrs(attrs map[string]any) (*InjectorAttrs, error) {
	data, err := json.Marshal(attrs)
	if err != nil {
		return nil, err
	}

	var ia InjectorAttrs
	if err := json.Unmarshal(data, &ia); err != nil {
		return nil, err
	}

	return &ia, nil
}

// ParseLogicGroup parses any value into LogicGroup.
func ParseLogicGroup(v any) (*LogicGroup, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}

	var lg LogicGroup
	if err := json.Unmarshal(data, &lg); err != nil {
		return nil, err
	}

	return &lg, nil
}

// ParseLogicRule parses any value into LogicRule.
func ParseLogicRule(v any) (*LogicRule, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}

	var lr LogicRule
	if err := json.Unmarshal(data, &lr); err != nil {
		return nil, err
	}

	return &lr, nil
}

// Serialize converts Document to JSON.
func (d *Document) Serialize() (json.RawMessage, error) {
	return json.Marshal(d)
}

// SerializeIndented converts Document to indented JSON.
func (d *Document) SerializeIndented() (json.RawMessage, error) {
	return json.MarshalIndent(d, "", "  ")
}
