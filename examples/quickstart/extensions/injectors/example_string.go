package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleStringInjector demonstrates a STRING type injectable.
type ExampleStringInjector struct{}

func (i *ExampleStringInjector) Code() string { return "example_string" }

func (i *ExampleStringInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		v := sdk.StringValue("Hello from " + injCtx.ExternalID())
		return &sdk.InjectorResult{Value: v}, nil
	}, nil
}

func (i *ExampleStringInjector) IsCritical() bool                  { return false }
func (i *ExampleStringInjector) Timeout() time.Duration             { return 0 }
func (i *ExampleStringInjector) DataType() sdk.ValueType            { return sdk.ValueTypeString }
func (i *ExampleStringInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleStringInjector) Formats() *sdk.FormatConfig         { return nil }
