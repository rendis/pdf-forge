package extensions

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/rendis/pdf-forge/extensions/tether/datasource"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/factory"
	"github.com/rendis/pdf-forge/extensions/tether/datasource/mongodb/entities"
	"github.com/rendis/pdf-forge/extensions/tether/shared"
	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// dynamicInjectorFactory holds the factory initialized in OnStart.
var dynamicInjectorFactory *factory.DynamicInjectorRepoFactory

// SetDynamicInjectorFactory sets the factory for dynamic injector repositories.
// Called from OnStart in register.go.
func SetDynamicInjectorFactory(f *factory.DynamicInjectorRepoFactory) {
	dynamicInjectorFactory = f
}

var surveyFactory *factory.SurveyRepoFactory

// SetSurveyFactory sets the factory for survey repositories.
func SetSurveyFactory(f *factory.SurveyRepoFactory) {
	surveyFactory = f
}

var applicationFactory *factory.ApplicationRepoFactory

// SetApplicationFactory sets the factory for application repositories.
func SetApplicationFactory(f *factory.ApplicationRepoFactory) {
	applicationFactory = f
}

const virtualPrefix = "has:"

// Supported operations for survey queries.
var surveyOperations = []string{"crm-application", "crm-admission"}

// DynamicWorkspaceProvider provides injectables from MongoDB pdf_forge_dynamic_injectors collection.
// Docs are stored per (campusId, operation). Merge per-operation happens at query time:
// for each operation, campus doc wins over system doc.
type DynamicWorkspaceProvider struct{}

// GetInjectables returns available injectables for a workspace.
// Extracts x-environment and x-campus-id from headers.
func (p *DynamicWorkspaceProvider) GetInjectables(ctx context.Context, injCtx *entity.InjectorContext) (*port.GetInjectablesResult, error) {
	if dynamicInjectorFactory == nil {
		slog.WarnContext(ctx, "dynamic injector factory not initialized")
		return &port.GetInjectablesResult{}, nil
	}

	env := datasource.ParseEnv(injCtx.Header("x-environment"))
	repo := dynamicInjectorFactory.Get(env)
	if repo == nil {
		slog.WarnContext(ctx, "no repository for environment", slog.String("env", env.String()))
		return &port.GetInjectablesResult{}, nil
	}

	campusID := injCtx.Header("x-campus-id")

	docs, err := repo.FindByCampus(ctx, campusID)
	if err != nil {
		slog.ErrorContext(ctx, "failed to fetch dynamic injectors",
			slog.String("env", env.String()),
			slog.String("campusId", campusID),
			slog.Any("error", err),
		)
		return nil, err
	}

	// Merge per-operation: campus doc wins over system doc for each operation
	merged := p.mergeByOperation(docs)

	// Map to SDK types
	injectables, groups := p.mapToProviderTypes(merged)

	slog.InfoContext(ctx, "dynamic injectables loaded",
		slog.String("env", env.String()),
		slog.String("campusId", campusID),
		slog.Int("docs", len(merged)),
		slog.Int("injectables", len(injectables)),
		slog.Int("groups", len(groups)),
	)

	return &port.GetInjectablesResult{
		Injectables: injectables,
		Groups:      groups,
	}, nil
}

// ResolveInjectables resolves injectable values during render.
// Virtual codes (has:{group}) return boolean indicating whether the user answered that survey.
// Composite codes ({templateType}:{questionCode}) return the actual answer value.
func (p *DynamicWorkspaceProvider) ResolveInjectables(ctx context.Context, req *port.ResolveInjectablesRequest) (*port.ResolveInjectablesResult, error) {
	// Extract required headers
	caseID := req.Headers["x-case-id"]
	if caseID == "" {
		return nil, errors.New("missing x-case-id header")
	}

	env := datasource.ParseEnv(req.Headers["x-environment"])

	// Validate caller ownership
	if err := p.validateCaller(ctx, req.Headers, env, caseID); err != nil {
		return nil, err
	}

	// Fetch answered surveys for this case
	surveysByType, err := p.fetchSurveys(ctx, env, caseID)
	if err != nil {
		return nil, err
	}

	// Resolve each code
	values := make(map[string]*entity.InjectableValue, len(req.Codes))
	resolveErrors := make(map[string]string)

	for _, code := range req.Codes {
		if isVirtualCode(code) {
			groupKey := parseVirtualCode(code)
			_, hasSurvey := surveysByType[groupKey]
			val := entity.BoolValue(hasSurvey)
			values[code] = &val
			continue
		}

		templateType, questionCode := parseCompositeCode(code)
		survey, ok := surveysByType[templateType]
		if !ok {
			resolveErrors[code] = fmt.Sprintf("no survey found for templateType %q", templateType)
			continue
		}

		answers, ok := survey.Answers[questionCode]
		if !ok || len(answers) == 0 {
			continue // no answer — leave nil (empty value)
		}

		val := answerToValue(answers)
		if val != nil {
			values[code] = val
		}
	}

	slog.InfoContext(ctx, "dynamic injectables resolved",
		slog.String("caseId", caseID),
		slog.Int("codes", len(req.Codes)),
		slog.Int("resolved", len(values)),
		slog.Int("errors", len(resolveErrors)),
	)

	return &port.ResolveInjectablesResult{
		Values: values,
		Errors: resolveErrors,
	}, nil
}

// validateCaller checks ownership based on x-caller-type header.
func (p *DynamicWorkspaceProvider) validateCaller(ctx context.Context, headers map[string]string, env datasource.Environment, caseID string) error {
	callerType := headers["x-caller-type"]

	switch callerType {
	case "campus":
		return nil
	case "user":
		return p.validateUserOwnership(ctx, headers, env, caseID)
	default:
		return fmt.Errorf("invalid or missing x-caller-type header: %q", callerType)
	}
}

// validateUserOwnership verifies the user (from JWT) owns the case.
func (p *DynamicWorkspaceProvider) validateUserOwnership(ctx context.Context, headers map[string]string, env datasource.Environment, caseID string) error {
	if applicationFactory == nil {
		return errors.New("application factory not initialized")
	}

	repo := applicationFactory.Get(env)
	if repo == nil {
		return errors.New("no application repository for environment")
	}

	token, err := shared.ExtractBearerToken(headers["authorization"])
	if err != nil {
		return fmt.Errorf("extract token: %w", err)
	}

	claims, err := shared.DecodeJWTClaims(token)
	if err != nil {
		return fmt.Errorf("decode token claims: %w", err)
	}

	owns, err := repo.ExistsByOwner(ctx, caseID, claims.UserID)
	if err != nil {
		return fmt.Errorf("check ownership: %w", err)
	}

	if !owns {
		slog.WarnContext(ctx, "user does not own case",
			slog.String("userId", claims.UserID),
			slog.String("caseId", caseID),
		)
		return errors.New("unauthorized: user does not own this case")
	}

	return nil
}

// fetchSurveys retrieves answered surveys and indexes them by templateType.
func (p *DynamicWorkspaceProvider) fetchSurveys(ctx context.Context, env datasource.Environment, caseID string) (map[string]*entities.SurveyDoc, error) {
	if surveyFactory == nil {
		return nil, errors.New("survey factory not initialized")
	}

	repo := surveyFactory.Get(env)
	if repo == nil {
		return nil, errors.New("no survey repository for environment")
	}

	surveys, err := repo.FindByCaseID(ctx, caseID, surveyOperations)
	if err != nil {
		return nil, fmt.Errorf("fetch surveys: %w", err)
	}

	byType := make(map[string]*entities.SurveyDoc, len(surveys))
	for i := range surveys {
		byType[surveys[i].TemplateType] = &surveys[i]
	}

	return byType, nil
}

// answerToValue converts a survey answer ([]any) to an InjectableValue.
// Single values are converted by Go type; multi-values are joined as comma-separated string.
func answerToValue(answer []any) *entity.InjectableValue {
	if len(answer) == 0 {
		return nil
	}

	// Multi-value (checkbox, multi_select): join as comma-separated string
	if len(answer) > 1 {
		parts := make([]string, 0, len(answer))
		for _, v := range answer {
			parts = append(parts, fmt.Sprintf("%v", v))
		}
		val := entity.StringValue(strings.Join(parts, ", "))
		return &val
	}

	// Single value: convert by Go type
	switch v := answer[0].(type) {
	case string:
		val := entity.StringValue(v)
		return &val
	case bool:
		val := entity.BoolValue(v)
		return &val
	case float64:
		val := entity.NumberValue(v)
		return &val
	case int:
		val := entity.NumberValue(float64(v))
		return &val
	case int32:
		val := entity.NumberValue(float64(v))
		return &val
	case int64:
		val := entity.NumberValue(float64(v))
		return &val
	default:
		val := entity.StringValue(fmt.Sprintf("%v", v))
		return &val
	}
}

// mergeByOperation selects the winning doc per operation.
// For each operation: if campus doc exists → use it; otherwise → use system doc.
func (p *DynamicWorkspaceProvider) mergeByOperation(docs []entities.DynamicInjectorDoc) []entities.DynamicInjectorDoc {
	systemByOp := make(map[string]entities.DynamicInjectorDoc)
	campusByOp := make(map[string]entities.DynamicInjectorDoc)

	for _, doc := range docs {
		if doc.IsSystem() {
			systemByOp[doc.Operation] = doc
		} else {
			campusByOp[doc.Operation] = doc
		}
	}

	// Per operation: campus wins, fallback to system
	var result []entities.DynamicInjectorDoc
	for op, systemDoc := range systemByOp {
		if campusDoc, ok := campusByOp[op]; ok {
			result = append(result, campusDoc)
		} else {
			result = append(result, systemDoc)
		}
	}

	// Add campus docs for operations system doesn't have
	for op, campusDoc := range campusByOp {
		if _, ok := systemByOp[op]; !ok {
			result = append(result, campusDoc)
		}
	}

	return result
}

// mapToProviderTypes converts multiple entity docs to port.ProviderInjectable and port.ProviderGroup.
// For each group, a virtual boolean injectable (has:{group}) is inserted first,
// followed by the real injectors of that group.
func (p *DynamicWorkspaceProvider) mapToProviderTypes(docs []entities.DynamicInjectorDoc) ([]port.ProviderInjectable, []port.ProviderGroup) {
	groupsMap := make(map[string]port.ProviderGroup)
	byGroup := make(map[string][]port.ProviderInjectable)
	var groupOrder []string

	for _, doc := range docs {
		for _, g := range doc.Groups {
			if _, ok := groupsMap[g.Key]; !ok {
				groupsMap[g.Key] = port.ProviderGroup{
					Key:  g.Key,
					Name: g.Name,
				}
				groupOrder = append(groupOrder, g.Key)
			}
		}

		for _, inj := range doc.Injectors {
			byGroup[inj.Group] = append(byGroup[inj.Group], port.ProviderInjectable{
				Code:        fmt.Sprintf("%s:%s", inj.Group, inj.Code),
				Label:       inj.Label,
				Description: inj.Description,
				DataType:    mapDataType(inj.DataType),
				GroupKey:    inj.Group,
			})
		}
	}

	// Build final slice: virtual first, then real injectors per group
	totalInj := len(groupOrder) // 1 virtual per group
	for _, items := range byGroup {
		totalInj += len(items)
	}
	injectables := make([]port.ProviderInjectable, 0, totalInj)
	for _, key := range groupOrder {
		g := groupsMap[key]
		injectables = append(injectables, port.ProviderInjectable{
			Code:     virtualPrefix + g.Key,
			Label:    g.Name,
			DataType: entity.InjectableDataTypeBoolean,
			GroupKey: g.Key,
		})
		injectables = append(injectables, byGroup[key]...)
	}

	groups := make([]port.ProviderGroup, 0, len(groupsMap))
	for _, key := range groupOrder {
		groups = append(groups, groupsMap[key])
	}

	return injectables, groups
}

// isVirtualCode checks if the code represents a virtual injectable (has:{group}).
func isVirtualCode(code string) bool {
	return strings.HasPrefix(code, virtualPrefix)
}

// parseVirtualCode extracts the group key from a virtual code "has:{group}".
func parseVirtualCode(code string) string {
	return strings.TrimPrefix(code, virtualPrefix)
}

// parseCompositeCode splits a composite code "{templateType}:{questionCode}" into its parts.
func parseCompositeCode(code string) (templateType, questionCode string) {
	parts := strings.SplitN(code, ":", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return "", code
}

// mapDataType converts string data type to entity.InjectableDataType.
func mapDataType(dt string) entity.InjectableDataType {
	switch dt {
	case "TEXT":
		return entity.InjectableDataTypeText
	case "NUMBER":
		return entity.InjectableDataTypeNumber
	case "DATE":
		return entity.InjectableDataTypeDate
	case "BOOLEAN":
		return entity.InjectableDataTypeBoolean
	case "LIST":
		return entity.InjectableDataTypeList
	default:
		return entity.InjectableDataTypeText
	}
}
