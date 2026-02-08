# Value Types

pdf-forge supports 7 value types for injectable variables. Each type has specific constructors and formatting options.

## Overview

| Type   | Constant              | Constructor                     | Example Use           |
| ------ | --------------------- | ------------------------------- | --------------------- |
| String | `sdk.ValueTypeString` | `sdk.StringValue("hello")`      | Text, names           |
| Number | `sdk.ValueTypeNumber` | `sdk.NumberValue(1234.56)`      | Amounts, quantities   |
| Bool   | `sdk.ValueTypeBool`   | `sdk.BoolValue(true)`           | Flags, toggles        |
| Time   | `sdk.ValueTypeTime`   | `sdk.TimeValue(time.Now())`     | Dates, timestamps     |
| Table  | `sdk.ValueTypeTable`  | `sdk.TableValueData(table)`     | Dynamic tables        |
| Image  | `sdk.ValueTypeImage`  | `sdk.ImageValue("https://...")` | Logos, signatures     |
| List   | `sdk.ValueTypeList`   | `sdk.ListValueData(list)`       | Bullet/numbered lists |

---

## String

Simple text values.

```go
func (i *CustomerNameInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        return &sdk.InjectorResult{
            Value: sdk.StringValue("John Doe"),
        }, nil
    }, nil
}
```

---

## Number

Numeric values with locale-aware formatting.

```go
return &sdk.InjectorResult{
    Value: sdk.NumberValue(1234.56),
}, nil
```

### Number Format Options

| Format      | Example Output |
| ----------- | -------------- |
| `#,##0.00`  | 1,234.56       |
| `#,##0`     | 1,235          |
| `#,##0.000` | 1,234.560      |
| `0.00`      | 1234.56        |
| `$#,##0.00` | $1,234.56      |
| `#,##0.00%` | 123,456.00%    |

---

## Bool

Boolean values with customizable display.

```go
return &sdk.InjectorResult{
    Value: sdk.BoolValue(true),
}, nil
```

### Bool Format Options

| Format       | True | False |
| ------------ | ---- | ----- |
| `Yes/No`     | Yes  | No    |
| `True/False` | True | False |
| `Si/No`      | Si   | No    |

---

## Time

Date and time values.

```go
return &sdk.InjectorResult{
    Value: sdk.TimeValue(time.Now()),
}, nil
```

### Time Format Options

| Category | Default            | Options                                                  |
| -------- | ------------------ | -------------------------------------------------------- |
| Date     | `DD/MM/YYYY`       | `MM/DD/YYYY`, `YYYY-MM-DD`, `D MMMM YYYY`, `DD MMM YYYY` |
| Time     | `HH:mm`            | `HH:mm:ss`, `hh:mm a`, `hh:mm:ss a`                      |
| DateTime | `DD/MM/YYYY HH:mm` | `YYYY-MM-DD HH:mm:ss`, `D MMMM YYYY, HH:mm`              |

---

## Table

Dynamic tables with styled headers and cells.

```go
table := sdk.NewTableValue().
    AddColumn("product", map[string]string{"en": "Product", "es": "Producto"}, sdk.ValueTypeString).
    AddColumnWithFormat("price", map[string]string{"en": "Price", "es": "Precio"}, sdk.ValueTypeNumber, "$#,##0.00").
    AddRow(
        sdk.Cell(sdk.StringValue("Widget A")),
        sdk.Cell(sdk.NumberValue(29.99)),
    ).
    AddRow(
        sdk.Cell(sdk.StringValue("Widget B")),
        sdk.Cell(sdk.NumberValue(49.99)),
    ).
    WithHeaderStyles(sdk.TableStyles{
        Background: sdk.StringPtr("#1a1a2e"),
        TextColor:  sdk.StringPtr("#ffffff"),
        FontWeight: sdk.StringPtr("bold"),
    })

return &sdk.InjectorResult{Value: sdk.TableValueData(table)}, nil
```

### Table Methods

| Method                                           | Description                   |
| ------------------------------------------------ | ----------------------------- |
| `NewTableValue()`                                | Create new table builder      |
| `AddColumn(key, labels, type)`                   | Add column with i18n labels   |
| `AddColumnWithFormat(key, labels, type, format)` | Add column with format        |
| `AddRow(cells...)`                               | Add row with cells            |
| `WithHeaderStyles(styles)`                       | Apply header styling          |
| `WithRowStyles(styles)`                          | Apply alternating row styling |

### TableStyles Fields

```go
type TableStyles struct {
    FontFamily *string // "Arial", "Times New Roman"
    FontSize   *int    // pixels
    FontWeight *string // "normal", "bold"
    TextColor  *string // "#333333"
    TextAlign  *string // "left", "center", "right"
    Background *string // "#f5f5f5" (headers)
}
```

---

## Image

Images from URLs with caching.

```go
return &sdk.InjectorResult{
    Value: sdk.ImageValue("https://example.com/logo.png"),
}, nil
```

**Notes:**

- Images are cached based on `typst.image_cache_dir` config
- Supports PNG, JPG, SVG formats
- URLs must be accessible from the server

---

## List

Bullet, numbered, or nested lists.

```go
list := sdk.NewListValue().
    WithSymbol(sdk.ListSymbolNumber).
    WithHeaderLabel(map[string]string{"en": "Requirements", "es": "Requisitos"}).
    AddItem(sdk.StringValue("Valid ID")).
    AddItem(sdk.StringValue("Proof of address")).
    AddNestedItem(sdk.StringValue("Financial documents"),
        sdk.ListItemValue(sdk.StringValue("Last 3 pay stubs")),
        sdk.ListItemValue(sdk.StringValue("Bank statements")),
    )

return &sdk.InjectorResult{Value: sdk.ListValueData(list)}, nil
```

### List Symbols

| Constant               | Display     |
| ---------------------- | ----------- |
| `sdk.ListSymbolBullet` | - (default) |
| `sdk.ListSymbolNumber` | 1. 2. 3.    |
| `sdk.ListSymbolDash`   | -           |
| `sdk.ListSymbolRoman`  | i. ii. iii. |
| `sdk.ListSymbolLetter` | a. b. c.    |

### List Methods

| Method                               | Description             |
| ------------------------------------ | ----------------------- |
| `NewListValue()`                     | Create new list builder |
| `WithSymbol(symbol)`                 | Set list symbol type    |
| `WithHeaderLabel(labels)`            | Add i18n header         |
| `AddItem(value)`                     | Add item                |
| `AddNestedItem(parent, children...)` | Add nested items        |

---

## Format Presets

Built-in format presets for `FormatConfig`:

### Date & Time

| Category | Default            | Options                                                  |
| -------- | ------------------ | -------------------------------------------------------- |
| Date     | `DD/MM/YYYY`       | `MM/DD/YYYY`, `YYYY-MM-DD`, `D MMMM YYYY`, `DD MMM YYYY` |
| Time     | `HH:mm`            | `HH:mm:ss`, `hh:mm a`, `hh:mm:ss a`                      |
| DateTime | `DD/MM/YYYY HH:mm` | `YYYY-MM-DD HH:mm:ss`, `D MMMM YYYY, HH:mm`              |

### Numbers

| Category   | Default     | Options                      |
| ---------- | ----------- | ---------------------------- |
| Number     | `#,##0.00`  | `#,##0`, `#,##0.000`, `0.00` |
| Currency   | `$#,##0.00` | `€#,##0.00`, `#,##0.00 USD`  |
| Percentage | `#,##0.00%` | `#,##0%`, `#,##0.0%`         |

### Special

| Category    | Default           | Options                          |
| ----------- | ----------------- | -------------------------------- |
| Phone       | `+## # #### ####` | `(###) ###-####`, `### ### ####` |
| Boolean     | `Yes/No`          | `True/False`, `Si/No`            |
| RUT (Chile) | `##.###.###-#`    | `########-#`                     |

---

## Using Formats in Injectors

Provide selectable format options that appear in the template editor:

```go
func (i *InvoiceDateInjector) DataType() sdk.ValueType { return sdk.ValueTypeTime }

func (i *InvoiceDateInjector) Formats() *sdk.FormatConfig {
    return &sdk.FormatConfig{
        Default: "DD/MM/YYYY",
        Options: []string{"DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMMM YYYY"},
    }
}
```

The template editor will show a dropdown with these format options when the user inserts this injectable.
