package config

import (
	_ "embed"
)

//go:embed builtin_i18n.yaml
var builtinI18nYAML []byte
