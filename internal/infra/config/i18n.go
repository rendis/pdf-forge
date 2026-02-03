package config

import (
	"maps"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// injectorI18n representa la traducción de un inyector.
type injectorI18n struct {
	Group       string            `yaml:"group"`
	Name        map[string]string `yaml:"name"`
	Description map[string]string `yaml:"description"`
}

// groupI18n representa la configuración de un grupo.
type groupI18n struct {
	Key  string            `yaml:"key"`
	Name map[string]string `yaml:"name"`
	Icon string            `yaml:"icon"`
}

// GroupConfig represents a resolved group with localized name.
type GroupConfig struct {
	Key   string
	Name  string
	Icon  string
	Order int
}

// InjectorI18nConfig contiene todas las traducciones de inyectores.
type InjectorI18nConfig struct {
	entries map[string]injectorI18n
	groups  []groupI18n
}

// configPaths are the paths to search for config files.
var configPaths = []string{
	"./settings",
	"../settings",
	"../../settings",
	".",
}

// rawI18nConfig represents the raw YAML structure with groups as array.
type rawI18nConfig struct {
	Groups []groupI18n `yaml:"groups"`
}

// LoadInjectorI18nFromFile loads injector translations from a specific file path.
func LoadInjectorI18nFromFile(filePath string) (*InjectorI18nConfig, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	return parseI18nData(data)
}

// LoadBuiltinInjectorI18n loads the embedded built-in i18n translations.
// This includes datetime injectors and other built-in injectors.
func LoadBuiltinInjectorI18n() (*InjectorI18nConfig, error) {
	return parseI18nData(builtinI18nYAML)
}

// LoadInjectorI18n carga traducciones desde settings/injectors.i18n.yaml.
// Si el archivo no existe, retorna un config vacío (el archivo es opcional).
func LoadInjectorI18n() (*InjectorI18nConfig, error) {
	var data []byte
	var found bool

	// Search for the file in multiple paths
	for _, basePath := range configPaths {
		filePath := filepath.Join(basePath, "injectors.i18n.yaml")
		var err error
		data, err = os.ReadFile(filePath)
		if err == nil {
			found = true
			break
		}
	}

	// If file not found in any path, return empty config
	if !found {
		return &InjectorI18nConfig{
			entries: make(map[string]injectorI18n),
			groups:  nil,
		}, nil
	}

	return parseI18nData(data)
}

// parseI18nData parses raw YAML bytes into InjectorI18nConfig.
func parseI18nData(data []byte) (*InjectorI18nConfig, error) {
	// First pass: extract groups section
	var rawConfig rawI18nConfig
	if err := yaml.Unmarshal(data, &rawConfig); err != nil {
		return nil, err
	}

	// Second pass: parse as generic map to extract injector entries
	var rawMap map[string]any
	if err := yaml.Unmarshal(data, &rawMap); err != nil {
		return nil, err
	}

	// Extract injector entries (skip 'groups' key)
	entries := make(map[string]injectorI18n)
	for key, value := range rawMap {
		if key == "groups" {
			continue
		}

		valueBytes, err := yaml.Marshal(value)
		if err != nil {
			continue
		}

		var entry injectorI18n
		if err := yaml.Unmarshal(valueBytes, &entry); err != nil {
			continue
		}

		entries[key] = entry
	}

	return &InjectorI18nConfig{entries: entries, groups: rawConfig.Groups}, nil
}

// GetName retorna el nombre traducido del inyector.
// Fallback: locale "en" → code si no existe.
func (c *InjectorI18nConfig) GetName(code, locale string) string {
	if c == nil || c.entries == nil {
		return code
	}

	entry, ok := c.entries[code]
	if !ok {
		return code
	}

	// Try requested locale
	if name, ok := entry.Name[locale]; ok {
		return name
	}

	// Fallback to English
	if name, ok := entry.Name["en"]; ok {
		return name
	}

	// Fallback to code
	return code
}

// GetDescription retorna la descripción traducida del inyector.
// Fallback: locale "en" → cadena vacía si no existe.
func (c *InjectorI18nConfig) GetDescription(code, locale string) string {
	if c == nil || c.entries == nil {
		return ""
	}

	entry, ok := c.entries[code]
	if !ok {
		return ""
	}

	// Try requested locale
	if desc, ok := entry.Description[locale]; ok {
		return desc
	}

	// Fallback to English
	if desc, ok := entry.Description["en"]; ok {
		return desc
	}

	return ""
}

// HasEntry verifica si existe una entrada para el code dado.
func (c *InjectorI18nConfig) HasEntry(code string) bool {
	if c == nil || c.entries == nil {
		return false
	}
	_, ok := c.entries[code]
	return ok
}

// Codes retorna todos los codes con traducciones.
func (c *InjectorI18nConfig) Codes() []string {
	if c == nil || c.entries == nil {
		return nil
	}

	codes := make([]string, 0, len(c.entries))
	for code := range c.entries {
		codes = append(codes, code)
	}
	return codes
}

// GetAllNames retorna todas las traducciones del nombre para un code.
// Si no existe el code, retorna un mapa con solo el code como fallback.
func (c *InjectorI18nConfig) GetAllNames(code string) map[string]string {
	if c == nil || c.entries == nil {
		return map[string]string{"en": code}
	}

	entry, ok := c.entries[code]
	if !ok || len(entry.Name) == 0 {
		return map[string]string{"en": code}
	}

	return maps.Clone(entry.Name)
}

// GetAllDescriptions retorna todas las traducciones de la descripción para un code.
// Si no existe el code, retorna un mapa vacío.
func (c *InjectorI18nConfig) GetAllDescriptions(code string) map[string]string {
	if c == nil || c.entries == nil {
		return map[string]string{}
	}

	entry, ok := c.entries[code]
	if !ok || len(entry.Description) == 0 {
		return map[string]string{}
	}

	return maps.Clone(entry.Description)
}

// GetGroup retorna el grupo al que pertenece un inyector.
// Retorna nil si el inyector no tiene grupo asignado.
func (c *InjectorI18nConfig) GetGroup(code string) *string {
	if c == nil || c.entries == nil {
		return nil
	}

	entry, ok := c.entries[code]
	if !ok || entry.Group == "" {
		return nil
	}

	return &entry.Group
}

// GetGroups retorna todos los grupos traducidos al locale especificado.
// El orden se determina por la posición en el array YAML (índice = orden).
func (c *InjectorI18nConfig) GetGroups(locale string) []GroupConfig {
	if c == nil || c.groups == nil {
		return nil
	}

	result := make([]GroupConfig, 0, len(c.groups))
	for i, group := range c.groups {
		name := group.Name[locale]
		if name == "" {
			name = group.Name["en"]
		}
		if name == "" {
			name = group.Key
		}

		result = append(result, GroupConfig{
			Key:   group.Key,
			Name:  name,
			Icon:  group.Icon,
			Order: i, // Order is determined by position in YAML array
		})
	}

	return result
}

// Merge combines another config into this one. The other config's entries
// override this config's entries for the same code. Groups from other are
// appended after this config's groups.
func (c *InjectorI18nConfig) Merge(other *InjectorI18nConfig) {
	if other == nil {
		return
	}
	if c.entries == nil {
		c.entries = make(map[string]injectorI18n)
	}
	for code, entry := range other.entries {
		c.entries[code] = entry
	}
	// Append new groups (avoid duplicates by key)
	existingKeys := make(map[string]bool)
	for _, g := range c.groups {
		existingKeys[g.Key] = true
	}
	for _, g := range other.groups {
		if !existingKeys[g.Key] {
			c.groups = append(c.groups, g)
		}
	}
}
