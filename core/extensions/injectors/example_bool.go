package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// ExampleBoolInjector demonstrates a boolean ValueType injector.
type ExampleBoolInjector struct{}

func (i *ExampleBoolInjector) Code() string { return "my_example_bool" }

func (i *ExampleBoolInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		v := entity.BoolValue(true)
		return &entity.InjectorResult{Value: v}, nil
	}, nil
}

func (i *ExampleBoolInjector) IsCritical() bool                      { return false }
func (i *ExampleBoolInjector) Timeout() time.Duration                { return 0 }
func (i *ExampleBoolInjector) DataType() entity.ValueType            { return entity.ValueTypeBool }
func (i *ExampleBoolInjector) DefaultValue() *entity.InjectableValue { return nil }
func (i *ExampleBoolInjector) Formats() *entity.FormatConfig         { return nil }
