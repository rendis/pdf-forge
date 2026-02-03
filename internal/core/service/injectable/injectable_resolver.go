package injectable

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

const (
	// DefaultInjectorTimeout is the default timeout for injectors.
	DefaultInjectorTimeout = 30 * time.Second
)

// ResolveResult contains the results of injector resolution.
type ResolveResult struct {
	mu sync.Mutex

	// Values contains the resolved values (code -> value).
	Values map[string]entity.InjectableValue

	// Errors contains errors from non-critical injectors.
	Errors map[string]error

	// Metadata contains additional metadata per injector.
	Metadata map[string]map[string]any
}

// InjectableResolverService resolves injector values.
type InjectableResolverService struct {
	registry port.InjectorRegistry
}

// NewInjectableResolverService creates a new resolution service.
func NewInjectableResolverService(registry port.InjectorRegistry) *InjectableResolverService {
	return &InjectableResolverService{
		registry: registry,
	}
}

// Resolve resolves the values of the referenced injectors.
// Executes Init() GLOBAL first, then resolves injectors by dependency levels.
func (s *InjectableResolverService) Resolve(
	ctx context.Context,
	injCtx *entity.InjectorContext,
	referencedCodes []string,
) (*ResolveResult, error) {
	result := &ResolveResult{
		Values:   make(map[string]entity.InjectableValue),
		Errors:   make(map[string]error),
		Metadata: make(map[string]map[string]any),
	}

	if len(referencedCodes) == 0 {
		return result, nil
	}

	// 1. Execute Init() GLOBAL if defined
	initFunc := s.registry.GetInitFunc()
	if initFunc != nil {
		slog.DebugContext(ctx, "executing global init function")
		initData, err := initFunc(ctx, injCtx)
		if err != nil {
			return nil, fmt.Errorf("global init failed: %w", err)
		}
		injCtx.SetInitData(initData)
	}

	// 2. Build dependency graph
	graph := NewDependencyGraph()
	err := graph.BuildFromInjectors(
		func(code string) ([]string, bool) {
			inj, ok := s.registry.Get(code)
			if !ok {
				return nil, false
			}
			_, deps := inj.Resolve()
			return deps, true
		},
		referencedCodes,
	)
	if err != nil {
		return nil, fmt.Errorf("building dependency graph: %w", err)
	}

	// 3. Get execution order (by levels)
	levels, err := graph.TopologicalSort()
	if err != nil {
		return nil, fmt.Errorf("topological sort: %w", err)
	}

	// 4. Execute injectors by levels
	for levelIdx, level := range levels {
		slog.DebugContext(ctx, "executing injector level",
			"level", levelIdx,
			"injectors", level,
		)

		if err := s.executeLevel(ctx, injCtx, level, result); err != nil {
			return nil, err
		}
	}

	return result, nil
}

// executeLevel executes all injectors in a level in parallel.
func (s *InjectableResolverService) executeLevel(
	ctx context.Context,
	injCtx *entity.InjectorContext,
	codes []string,
	result *ResolveResult,
) error {
	g, gCtx := errgroup.WithContext(ctx)

	for _, code := range codes {
		g.Go(func() error {
			return s.executeInjector(gCtx, injCtx, code, result)
		})
	}

	return g.Wait()
}

// executeInjector executes an individual injector.
func (s *InjectableResolverService) executeInjector(
	ctx context.Context,
	injCtx *entity.InjectorContext,
	code string,
	result *ResolveResult,
) error {
	inj, ok := s.registry.Get(code)
	if !ok {
		slog.WarnContext(ctx, "injector not found", "code", code)
		return nil
	}

	// Get the resolution function
	resolveFunc, _ := inj.Resolve()
	if resolveFunc == nil {
		slog.WarnContext(ctx, "injector has nil resolve function", "code", code)
		return nil
	}

	// Determine timeout
	timeout := inj.Timeout()
	if timeout <= 0 {
		timeout = DefaultInjectorTimeout
	}

	// Create context with timeout
	timeoutCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Execute injector
	slog.DebugContext(ctx, "executing injector", "code", code, "timeout", timeout)

	injResult, err := resolveFunc(timeoutCtx, injCtx)
	if err != nil {
		slog.ErrorContext(ctx, "injector failed",
			"code", code,
			"error", err,
			"critical", inj.IsCritical(),
		)

		if inj.IsCritical() {
			return fmt.Errorf("critical injector %q failed: %w", code, err)
		}

		// Non-critical error, save and continue
		result.mu.Lock()
		result.Errors[code] = err
		result.mu.Unlock()
		return nil
	}

	// Save result
	if injResult != nil {
		result.mu.Lock()
		result.Values[code] = injResult.Value
		if injResult.Metadata != nil {
			result.Metadata[code] = injResult.Metadata
		}
		result.mu.Unlock()

		injCtx.SetResolved(code, injResult.Value.AsAny())
	}

	slog.DebugContext(ctx, "injector completed", "code", code)
	return nil
}

// MergeWithPayloadValues combines injector values with values extracted from the payload.
// Payload values have priority (they overwrite injector values).
func (s *InjectableResolverService) MergeWithPayloadValues(
	resolved *ResolveResult,
	payloadValues map[string]entity.InjectableValue,
) map[string]any {
	merged := make(map[string]any)

	// First add injector values
	for code, value := range resolved.Values {
		merged[code] = value.AsAny()
	}

	// Then overwrite with payload values
	for key, value := range payloadValues {
		merged[key] = value.AsAny()
	}

	return merged
}
