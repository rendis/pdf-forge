package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// ExampleTimeInjector demonstrates a time ValueType injector.
type ExampleTimeInjector struct{}

func (i *ExampleTimeInjector) Code() string { return "my_example_time" }

func (i *ExampleTimeInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		v := entity.TimeValue(time.Now())
		return &entity.InjectorResult{Value: v}, nil
	}, nil
}

func (i *ExampleTimeInjector) IsCritical() bool                      { return false }
func (i *ExampleTimeInjector) Timeout() time.Duration                { return 0 }
func (i *ExampleTimeInjector) DataType() entity.ValueType            { return entity.ValueTypeTime }
func (i *ExampleTimeInjector) DefaultValue() *entity.InjectableValue { return nil }
func (i *ExampleTimeInjector) Formats() *entity.FormatConfig         { return nil }
