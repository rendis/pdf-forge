package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// ExampleValueInjector demonstrates a string ValueType injector.
// It returns a greeting that includes the request's external ID.
//
// To use in templates, insert the injectable with code "my_example_value".
// The resolved value will be "Hello from <externalID>".
type ExampleValueInjector struct{}

func (i *ExampleValueInjector) Code() string { return "my_example_value" }

func (i *ExampleValueInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		v := entity.StringValue("Hello from " + injCtx.ExternalID())
		return &entity.InjectorResult{Value: v}, nil
	}, nil // no dependencies
}

func (i *ExampleValueInjector) IsCritical() bool                      { return false }
func (i *ExampleValueInjector) Timeout() time.Duration                { return 0 }
func (i *ExampleValueInjector) DataType() entity.ValueType            { return entity.ValueTypeString }
func (i *ExampleValueInjector) DefaultValue() *entity.InjectableValue { return nil }
func (i *ExampleValueInjector) Formats() *entity.FormatConfig         { return nil }
