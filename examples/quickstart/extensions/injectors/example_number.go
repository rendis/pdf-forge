package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleNumberInjector demonstrates a NUMBER type injectable.
type ExampleNumberInjector struct{}

func (i *ExampleNumberInjector) Code() string { return "example_number" }

func (i *ExampleNumberInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		return &sdk.InjectorResult{
			Value: sdk.NumberValue(42),
		}, nil
	}, nil
}

func (i *ExampleNumberInjector) IsCritical() bool                  { return false }
func (i *ExampleNumberInjector) Timeout() time.Duration             { return 0 }
func (i *ExampleNumberInjector) DataType() sdk.ValueType            { return sdk.ValueTypeNumber }
func (i *ExampleNumberInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleNumberInjector) Formats() *sdk.FormatConfig         { return nil }
