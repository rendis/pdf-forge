package injectable

import (
	"context"
	"fmt"
	"time"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
	injectableuc "github.com/rendis/pdf-forge/core/internal/core/usecase/injectable"
)

// Ensure InjectableService implements InjectableUseCase.
var _ injectableuc.InjectableUseCase = (*InjectableService)(nil)

// NewInjectableService creates a new injectable service.
func NewInjectableService(
	injectableRepo port.InjectableRepository,
	systemInjectableRepo port.SystemInjectableRepository,
	injectorRegistry port.InjectorRegistry,
	workspaceRepo port.WorkspaceRepository,
	tenantRepo port.TenantRepository,
	workspaceProvider port.WorkspaceInjectableProvider, // can be nil
) injectableuc.InjectableUseCase {
	return &InjectableService{
		injectableRepo:       injectableRepo,
		systemInjectableRepo: systemInjectableRepo,
		injectorRegistry:     injectorRegistry,
		workspaceRepo:        workspaceRepo,
		tenantRepo:           tenantRepo,
		workspaceProvider:    workspaceProvider,
	}
}

// InjectableService implements injectable definition business logic.
// Note: Injectables are read-only - they are managed via database migrations/seeds.
type InjectableService struct {
	injectableRepo       port.InjectableRepository
	systemInjectableRepo port.SystemInjectableRepository
	injectorRegistry     port.InjectorRegistry
	workspaceRepo        port.WorkspaceRepository
	tenantRepo           port.TenantRepository
	workspaceProvider    port.WorkspaceInjectableProvider // can be nil
}

// GetInjectable retrieves an injectable definition by ID.
func (s *InjectableService) GetInjectable(ctx context.Context, id string) (*entity.InjectableDefinition, error) {
	injectable, err := s.injectableRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding injectable %s: %w", id, err)
	}
	return injectable, nil
}

// ListInjectables lists all injectable definitions for a workspace (including global, system, and provider).
func (s *InjectableService) ListInjectables(ctx context.Context, req *injectableuc.ListInjectablesRequest) (*injectableuc.ListInjectablesResult, error) {
	dbInjectables, err := s.injectableRepo.FindByWorkspace(ctx, req.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing injectables: %w", err)
	}

	systemInjectables, err := s.getSystemInjectables(ctx, req.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing system injectables: %w", err)
	}

	// Get provider injectables if provider is registered
	var providerInjectables []*entity.InjectableDefinition
	var providerGroups []port.GroupConfig
	if s.workspaceProvider != nil {
		tenantCode, workspaceCode, err := s.getWorkspaceCodes(ctx, req.WorkspaceID)
		if err != nil {
			return nil, fmt.Errorf("getting workspace codes: %w", err)
		}

		injCtx := entity.NewInjectorContextWithCodes("", "", "", "list", tenantCode, workspaceCode, nil, nil)
		providerResult, err := s.workspaceProvider.GetInjectables(ctx, injCtx)
		if err != nil {
			return nil, fmt.Errorf("getting provider injectables: %w", err)
		}

		if providerResult != nil {
			providerInjectables = s.convertProviderInjectables(req.WorkspaceID, providerResult.Injectables)
			providerGroups = s.convertProviderGroups(providerResult.Groups)

			// Validate no duplicate codes with existing injectables
			if err := s.validateNoDuplicateCodes(dbInjectables, systemInjectables, providerInjectables); err != nil {
				return nil, err
			}
		}
	}

	// Merge all injectables
	allInjectables := s.mergeInjectables(dbInjectables, systemInjectables)
	allInjectables = append(allInjectables, providerInjectables...)

	// Merge groups (registry groups + provider groups)
	registryGroups := s.injectorRegistry.GetAllGroups()
	allGroups := make([]port.GroupConfig, 0, len(registryGroups)+len(providerGroups))
	allGroups = append(allGroups, registryGroups...)
	allGroups = append(allGroups, providerGroups...)

	return &injectableuc.ListInjectablesResult{
		Injectables: allInjectables,
		Groups:      allGroups,
	}, nil
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

	labels := s.injectorRegistry.GetAllNames(code)
	descriptions := s.injectorRegistry.GetAllDescriptions(code)

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
		ID:           code,
		WorkspaceID:  nil,
		Key:          code,
		Labels:       labels,
		Descriptions: descriptions,
		DataType:     dataType,
		SourceType:   entity.InjectableSourceTypeInternal,
		Metadata:     metadata,
		FormatConfig: formatConfig,
		Group:        s.injectorRegistry.GetGroup(code),
		DefaultValue: defaultValue,
		IsActive:     true,
		IsDeleted:    false,
		CreatedAt:    time.Time{},
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

// getWorkspaceCodes retrieves tenant and workspace codes from workspace ID.
func (s *InjectableService) getWorkspaceCodes(ctx context.Context, workspaceID string) (tenantCode, workspaceCode string, err error) {
	workspace, err := s.workspaceRepo.FindByID(ctx, workspaceID)
	if err != nil {
		return "", "", fmt.Errorf("finding workspace: %w", err)
	}
	workspaceCode = workspace.Code

	if workspace.TenantID != nil {
		tenant, err := s.tenantRepo.FindByID(ctx, *workspace.TenantID)
		if err != nil {
			return "", "", fmt.Errorf("finding tenant: %w", err)
		}
		tenantCode = tenant.Code
	}

	return tenantCode, workspaceCode, nil
}

// convertProviderInjectables converts provider injectables to entity definitions.
func (s *InjectableService) convertProviderInjectables(workspaceID string, injectables []port.ProviderInjectable) []*entity.InjectableDefinition {
	result := make([]*entity.InjectableDefinition, 0, len(injectables))
	for _, inj := range injectables {
		def := &entity.InjectableDefinition{
			ID:           inj.Code,
			WorkspaceID:  nil,
			Key:          inj.Code,
			Labels:       inj.Label,
			Descriptions: inj.Description,
			DataType:     inj.DataType,
			SourceType:   entity.InjectableSourceTypeExternal,
			Metadata:     nil,
			IsActive:     true,
			IsDeleted:    false,
			CreatedAt:    time.Time{},
		}
		if inj.GroupKey != "" {
			def.Group = &inj.GroupKey
		}
		if len(inj.Formats) > 0 {
			options := make([]string, len(inj.Formats))
			for i, f := range inj.Formats {
				options[i] = f.Key
			}
			def.FormatConfig = &entity.FormatConfig{
				Default: inj.Formats[0].Key,
				Options: options,
			}
		}
		result = append(result, def)
	}
	return result
}

// convertProviderGroups converts provider groups to GroupConfig.
func (s *InjectableService) convertProviderGroups(groups []port.ProviderGroup) []port.GroupConfig {
	result := make([]port.GroupConfig, 0, len(groups))
	for i, g := range groups {
		names := g.Name
		if names == nil {
			names = map[string]string{"en": g.Key}
		}
		result = append(result, port.GroupConfig{
			Key:   g.Key,
			Names: names,
			Icon:  g.Icon,
			Order: 1000 + i,
		})
	}
	return result
}

// validateNoDuplicateCodes checks that provider codes don't conflict with existing codes.
func (s *InjectableService) validateNoDuplicateCodes(db, system, provider []*entity.InjectableDefinition) error {
	existingCodes := make(map[string]bool)
	for _, inj := range db {
		existingCodes[inj.Key] = true
	}
	for _, inj := range system {
		existingCodes[inj.Key] = true
	}

	for _, inj := range provider {
		if existingCodes[inj.Key] {
			return fmt.Errorf("provider injectable code %q conflicts with existing injectable", inj.Key)
		}
	}
	return nil
}
