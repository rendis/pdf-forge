package injectable

import (
	"context"
	"fmt"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
	injectableuc "github.com/rendis/pdf-forge/internal/core/usecase/injectable"
)

// Ensure InjectableService implements InjectableUseCase.
var _ injectableuc.InjectableUseCase = (*InjectableService)(nil)

// NewInjectableService creates a new injectable service.
func NewInjectableService(
	injectableRepo port.InjectableRepository,
	systemInjectableRepo port.SystemInjectableRepository,
	injectorRegistry port.InjectorRegistry,
) injectableuc.InjectableUseCase {
	return &InjectableService{
		injectableRepo:       injectableRepo,
		systemInjectableRepo: systemInjectableRepo,
		injectorRegistry:     injectorRegistry,
	}
}

// InjectableService implements injectable definition business logic.
// Note: Injectables are read-only - they are managed via database migrations/seeds.
type InjectableService struct {
	injectableRepo       port.InjectableRepository
	systemInjectableRepo port.SystemInjectableRepository
	injectorRegistry     port.InjectorRegistry
}

// GetInjectable retrieves an injectable definition by ID.
func (s *InjectableService) GetInjectable(ctx context.Context, id string) (*entity.InjectableDefinition, error) {
	injectable, err := s.injectableRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding injectable %s: %w", id, err)
	}
	return injectable, nil
}

// ListInjectables lists all injectable definitions for a workspace (including global and system).
func (s *InjectableService) ListInjectables(ctx context.Context, workspaceID string) ([]*entity.InjectableDefinition, error) {
	dbInjectables, err := s.injectableRepo.FindByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing injectables: %w", err)
	}

	systemInjectables, err := s.getSystemInjectables(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing system injectables: %w", err)
	}

	return s.mergeInjectables(dbInjectables, systemInjectables), nil
}

// getSystemInjectables returns system injectables filtered by active assignments for the workspace.
func (s *InjectableService) getSystemInjectables(ctx context.Context, workspaceID string) ([]*entity.InjectableDefinition, error) {
	if s.injectorRegistry == nil || s.systemInjectableRepo == nil {
		return nil, nil
	}

	activeKeys, err := s.systemInjectableRepo.FindActiveKeysForWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	activeKeySet := make(map[string]bool, len(activeKeys))
	for _, key := range activeKeys {
		activeKeySet[key] = true
	}

	injectors := s.injectorRegistry.GetAll()
	result := make([]*entity.InjectableDefinition, 0, len(activeKeys))
	for _, inj := range injectors {
		if activeKeySet[inj.Code()] {
			result = append(result, s.injectorToDefinition(inj))
		}
	}

	return result, nil
}

// injectorToDefinition converts a port.Injector to entity.InjectableDefinition.
func (s *InjectableService) injectorToDefinition(inj port.Injector) *entity.InjectableDefinition {
	code := inj.Code()

	// Get translations (default to "es" locale, fallback to code)
	label := s.injectorRegistry.GetName(code, "es")
	description := s.injectorRegistry.GetDescription(code, "es")

	// Convert DataType
	dataType := convertValueTypeToDataType(inj.DataType())

	// Convert FormatConfig
	var formatConfig *entity.FormatConfig
	if formats := inj.Formats(); formats != nil {
		formatConfig = &entity.FormatConfig{
			Default: formats.Default,
			Options: formats.Options,
		}
	}

	// Convert DefaultValue
	var defaultValue *string
	if defVal := inj.DefaultValue(); defVal != nil {
		if str, ok := defVal.String(); ok {
			defaultValue = &str
		}
	}

	// Build metadata - for TABLE types, include column schema; for LIST types, include list schema
	var metadata map[string]any
	if tableProvider, ok := inj.(port.TableSchemaProvider); ok {
		columns := tableProvider.ColumnSchema()
		if len(columns) > 0 {
			metadata = map[string]any{
				"columns": columns,
			}
		}
	}
	if listProvider, ok := inj.(port.ListSchemaProvider); ok {
		schema := listProvider.ListSchema()
		if metadata == nil {
			metadata = make(map[string]any)
		}
		metadata["listSchema"] = schema
	}

	return &entity.InjectableDefinition{
		ID:           code, // Same as key
		WorkspaceID:  nil,  // Global (extension injectors are system-wide)
		Key:          code,
		Label:        label,
		Description:  description,
		DataType:     dataType,
		SourceType:   entity.InjectableSourceTypeInternal, // System injectors are auto-calculated
		Metadata:     metadata,
		FormatConfig: formatConfig,
		Group:        s.injectorRegistry.GetGroup(code),
		DefaultValue: defaultValue,
		IsActive:     true,
		IsDeleted:    false,
		CreatedAt:    time.Time{}, // Extensions don't have creation time
		UpdatedAt:    nil,
	}
}

// convertValueTypeToDataType converts entity.ValueType to entity.InjectableDataType.
func convertValueTypeToDataType(vt entity.ValueType) entity.InjectableDataType {
	switch vt {
	case entity.ValueTypeString:
		return entity.InjectableDataTypeText
	case entity.ValueTypeNumber:
		return entity.InjectableDataTypeNumber
	case entity.ValueTypeBool:
		return entity.InjectableDataTypeBoolean
	case entity.ValueTypeTime:
		return entity.InjectableDataTypeDate
	case entity.ValueTypeTable:
		return entity.InjectableDataTypeTable
	case entity.ValueTypeImage:
		return entity.InjectableDataTypeImage
	case entity.ValueTypeList:
		return entity.InjectableDataTypeList
	default:
		return entity.InjectableDataTypeText
	}
}

// mergeInjectables merges DB and extension injectables.
// DB injectables take priority (can override extension keys).
func (s *InjectableService) mergeInjectables(db, ext []*entity.InjectableDefinition) []*entity.InjectableDefinition {
	// Build set of DB keys
	dbKeys := make(map[string]bool)
	for _, inj := range db {
		dbKeys[inj.Key] = true
	}

	// Start with DB injectables
	result := make([]*entity.InjectableDefinition, 0, len(db)+len(ext))
	result = append(result, db...)

	// Add extension injectables that don't conflict with DB keys
	for _, inj := range ext {
		if !dbKeys[inj.Key] {
			result = append(result, inj)
		}
	}

	return result
}

// GetGroups returns all groups translated to the specified locale.
func (s *InjectableService) GetGroups(locale string) []port.GroupConfig {
	if s.injectorRegistry == nil {
		return nil
	}
	return s.injectorRegistry.GetGroups(locale)
}
