package injectors

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// ExampleTableInjector demonstrates a TABLE type injectable.
type ExampleTableInjector struct{}

func (i *ExampleTableInjector) Code() string { return "my_example_table" }

func (i *ExampleTableInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		table := entity.NewTableValue().
			AddColumn("item", map[string]string{"es": "Item", "en": "Item"}, entity.ValueTypeString).
			AddColumn("description", map[string]string{"es": "Descripción", "en": "Description"}, entity.ValueTypeString).
			AddColumn("value", map[string]string{"es": "Valor", "en": "Value"}, entity.ValueTypeNumber).
			AddRow(
				entity.Cell(entity.StringValue("A")),
				entity.Cell(entity.StringValue("First example item")),
				entity.Cell(entity.NumberValue(100.00)),
			).
			AddRow(
				entity.Cell(entity.StringValue("B")),
				entity.Cell(entity.StringValue("Second example item")),
				entity.Cell(entity.NumberValue(200.00)),
			).
			AddRow(
				entity.Cell(entity.StringValue("C")),
				entity.Cell(entity.StringValue("Third example item")),
				entity.Cell(entity.NumberValue(300.00)),
			).
			WithHeaderStyles(entity.TableStyles{
				Background: entity.StringPtr("#f0f0f0"),
				FontWeight: entity.StringPtr("bold"),
				TextAlign:  entity.StringPtr("center"),
			})

		return &entity.InjectorResult{Value: entity.TableValueData(table)}, nil
	}, nil
}

func (i *ExampleTableInjector) IsCritical() bool                      { return false }
func (i *ExampleTableInjector) Timeout() time.Duration                { return 0 }
func (i *ExampleTableInjector) DataType() entity.ValueType            { return entity.ValueTypeTable }
func (i *ExampleTableInjector) DefaultValue() *entity.InjectableValue { return nil }
func (i *ExampleTableInjector) Formats() *entity.FormatConfig         { return nil }

// ColumnSchema implements port.TableSchemaProvider.
func (i *ExampleTableInjector) ColumnSchema() []entity.TableColumn {
	return []entity.TableColumn{
		{Key: "item", Labels: map[string]string{"es": "Item", "en": "Item"}, DataType: entity.ValueTypeString},
		{Key: "description", Labels: map[string]string{"es": "Descripción", "en": "Description"}, DataType: entity.ValueTypeString},
		{Key: "value", Labels: map[string]string{"es": "Valor", "en": "Value"}, DataType: entity.ValueTypeNumber},
	}
}
