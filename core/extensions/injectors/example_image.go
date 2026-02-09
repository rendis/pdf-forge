package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// ExampleImageInjector demonstrates an IMAGE type injectable.
// IMAGE injectables return URLs that are resolved when rendering documents.
type ExampleImageInjector struct{}

func (i *ExampleImageInjector) Code() string { return "my_example_image" }

func (i *ExampleImageInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		return &entity.InjectorResult{
			Value: entity.ImageValue("https://picsum.photos/seed/example/400/300"),
		}, nil
	}, nil
}

func (i *ExampleImageInjector) IsCritical() bool           { return false }
func (i *ExampleImageInjector) Timeout() time.Duration     { return 0 }
func (i *ExampleImageInjector) DataType() entity.ValueType { return entity.ValueTypeImage }
func (i *ExampleImageInjector) DefaultValue() *entity.InjectableValue {
	v := entity.ImageValue("https://picsum.photos/400/300")
	return &v
}
func (i *ExampleImageInjector) Formats() *entity.FormatConfig { return nil }
