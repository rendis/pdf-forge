package datetime

import (
	"context"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// DayNowInjector returns the current day of the month.
//

type DayNowInjector struct{}

func (i *DayNowInjector) Code() string { return "day_now" }

func (i *DayNowInjector) DataType() entity.ValueType { return entity.ValueTypeNumber }

func (i *DayNowInjector) DefaultValue() *entity.InjectableValue { return nil }

func (i *DayNowInjector) Formats() *entity.FormatConfig { return nil }

func (i *DayNowInjector) Resolve() (port.ResolveFunc, []string) {
	return func(ctx context.Context, injCtx *entity.InjectorContext) (*entity.InjectorResult, error) {
		day := float64(time.Now().Day())
		return &entity.InjectorResult{Value: entity.NumberValue(day)}, nil
	}, nil
}

func (i *DayNowInjector) IsCritical() bool       { return false }
func (i *DayNowInjector) Timeout() time.Duration { return 0 }
