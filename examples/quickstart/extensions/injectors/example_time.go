package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleTimeInjector demonstrates a TIME type injectable.
type ExampleTimeInjector struct{}

func (i *ExampleTimeInjector) Code() string { return "example_time" }

func (i *ExampleTimeInjector) Resolve() (sdk.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
		return &sdk.InjectorResult{
			Value: sdk.TimeValue(time.Now()),
		}, nil
	}, nil
}

func (i *ExampleTimeInjector) IsCritical() bool                  { return false }
func (i *ExampleTimeInjector) Timeout() time.Duration             { return 0 }
func (i *ExampleTimeInjector) DataType() sdk.ValueType            { return sdk.ValueTypeTime }
func (i *ExampleTimeInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *ExampleTimeInjector) Formats() *sdk.FormatConfig         { return nil }
