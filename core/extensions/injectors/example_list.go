package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// ExampleListInjector demonstrates a LIST type injectable.
type ExampleListInjector struct{}

func (i *ExampleListInjector) Code() string { return "my_example_list" }

func (i *ExampleListInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		list := entity.NewListValue().
			WithSymbol(entity.ListSymbolBullet).
			WithHeaderLabel(map[string]string{
				"es": "Requisitos del documento",
				"en": "Document Requirements",
			}).
			AddNestedItem(entity.StringValue("Identification"),
				entity.ListItemValue(entity.StringValue("Valid government ID")),
				entity.ListItemValue(entity.StringValue("Proof of address")),
			).
			AddNestedItem(entity.StringValue("Financial Information"),
				entity.ListItemValue(entity.StringValue("Last 3 months bank statements")),
				entity.ListItemNested(entity.StringValue("Tax return"),
					entity.ListItemValue(entity.StringValue("Federal")),
					entity.ListItemValue(entity.StringValue("State/Provincial")),
				),
			).
			WithHeaderStyles(entity.ListStyles{
				FontWeight: entity.StringPtr("bold"),
				FontSize:   entity.IntPtr(14),
			})

		return &entity.InjectorResult{Value: entity.ListValueData(list)}, nil
	}, nil
}

func (i *ExampleListInjector) IsCritical() bool                      { return false }
func (i *ExampleListInjector) Timeout() time.Duration                { return 0 }
func (i *ExampleListInjector) DataType() entity.ValueType            { return entity.ValueTypeList }
func (i *ExampleListInjector) DefaultValue() *entity.InjectableValue { return nil }
func (i *ExampleListInjector) Formats() *entity.FormatConfig         { return nil }

// ListSchema implements port.ListSchemaProvider.
func (i *ExampleListInjector) ListSchema() entity.ListSchema {
	return entity.ListSchema{
		Symbol: entity.ListSymbolBullet,
		HeaderLabel: map[string]string{
			"es": "Requisitos del documento",
			"en": "Document Requirements",
		},
	}
}
