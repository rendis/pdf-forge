package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// ExampleNumberInjector demonstrates a number ValueType injector.
type ExampleNumberInjector struct{}

func (i *ExampleNumberInjector) Code() string { return "my_example_number" }

func (i *ExampleNumberInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		v := entity.NumberValue(42.5)
		return &entity.InjectorResult{Value: v}, nil
	}, nil
}

func (i *ExampleNumberInjector) IsCritical() bool                      { return false }
func (i *ExampleNumberInjector) Timeout() time.Duration                { return 0 }
func (i *ExampleNumberInjector) DataType() entity.ValueType            { return entity.ValueTypeNumber }
func (i *ExampleNumberInjector) DefaultValue() *entity.InjectableValue { return nil }
func (i *ExampleNumberInjector) Formats() *entity.FormatConfig         { return nil }
