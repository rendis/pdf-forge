package datetime

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// YearNowInjector returns the current year.
//

type YearNowInjector struct{}

func (i *YearNowInjector) Code() string { return "year_now" }

func (i *YearNowInjector) DataType() entity.ValueType { return entity.ValueTypeNumber }

func (i *YearNowInjector) DefaultValue() *entity.InjectableValue { return nil }

func (i *YearNowInjector) Formats() *entity.FormatConfig { return nil }

func (i *YearNowInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		year := float64(time.Now().Year())
		return &entity.InjectorResult{Value: entity.NumberValue(year)}, nil
	}, nil
}

func (i *YearNowInjector) IsCritical() bool       { return false }
func (i *YearNowInjector) Timeout() time.Duration { return 0 }
