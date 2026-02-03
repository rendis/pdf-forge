package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleBoolInjector demonstrates a BOOL type injectable.
type ExampleBoolInjector struct{}

func (i *ExampleBoolInjector) Code() string { return "example_bool" }

func (i *ExampleBoolInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		return &sdk.InjectorResult{
			Value: sdk.BoolValue(true),
		}, nil
	}, nil
}

func (i *ExampleBoolInjector) IsCritical() bool                  { return false }
func (i *ExampleBoolInjector) Timeout() time.Duration             { return 0 }
func (i *ExampleBoolInjector) DataType() sdk.ValueType            { return sdk.ValueTypeBool }
func (i *ExampleBoolInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleBoolInjector) Formats() *sdk.FormatConfig         { return nil }
