# Types Reference

## InjectableValue

Type-safe wrapper for injectable values.

### Constructors

```go
sdk.StringValue(s string) InjectableValue          // Text
sdk.NumberValue(n float64) InjectableValue         // Numbers
sdk.BoolValue(b bool) InjectableValue              // Booleans
sdk.TimeValue(t time.Time) InjectableValue         // Date/time
sdk.ImageValue(url string) InjectableValue         // Image URL
sdk.TableValueData(t *TableValue) InjectableValue  // Complex table
sdk.ListValueData(l *ListValue) InjectableValue    // Hierarchical list
```

### Accessors

```go
value.Type() ValueType                // Get type
value.String() (string, bool)         // Extract as string
value.Number() (float64, bool)        // Extract as number
value.Bool() (bool, bool)             // Extract as bool
value.Time() (time.Time, bool)        // Extract as time
value.Table() (*TableValue, bool)     // Extract as table
value.List() (*ListValue, bool)       // Extract as list
value.AsAny() any                     // Extract as interface{}
```

### InjectorResult

```go
&sdk.InjectorResult{
    Value:    sdk.StringValue("hello"),
    Metadata: map[string]any{"source": "api"},  // optional, for logging
}
```

---

## Tables API

### Table Basic Usage

```go
table := sdk.NewTableValue().
    AddColumn("item", map[string]string{"es": "Item", "en": "Item"}, sdk.ValueTypeString).
    AddColumn("qty", map[string]string{"es": "Cantidad", "en": "Quantity"}, sdk.ValueTypeNumber).
    AddColumn("price", map[string]string{"es": "Precio", "en": "Price"}, sdk.ValueTypeNumber).
    AddRow(
        sdk.Cell(sdk.StringValue("Widget A")),
        sdk.Cell(sdk.NumberValue(10)),
        sdk.Cell(sdk.NumberValue(99.99)),
    ).
    AddRow(
        sdk.Cell(sdk.StringValue("Widget B")),
        sdk.Cell(sdk.NumberValue(5)),
        sdk.Cell(sdk.NumberValue(149.99)),
    ).
    WithHeaderStyles(sdk.TableStyles{
        Background: sdk.StringPtr("#f0f0f0"),
        FontWeight: sdk.StringPtr("bold"),
        TextAlign:  sdk.StringPtr("center"),
    })

return &sdk.InjectorResult{Value: sdk.TableValueData(table)}, nil
```

### Column Methods

```go
// Basic column
AddColumn(key string, labels map[string]string, dataType ValueType) *TableValue

// With width
AddColumnWithWidth(key string, labels map[string]string, dataType ValueType, width string) *TableValue
// width: "100px", "20%", "auto"

// With format
AddColumnWithFormat(key string, labels map[string]string, dataType ValueType, format string) *TableValue
// format: "DD/MM/YYYY", "$#,##0.00", etc.
```

### Cell Helpers

```go
sdk.Cell(value InjectableValue) TableCell              // Simple cell
sdk.CellWithSpan(value InjectableValue, colspan, rowspan int) TableCell  // Merged cell
sdk.EmptyCell() TableCell                              // Empty (for merged regions)
```

### TableColumn

```go
type TableColumn struct {
    Key      string            // Unique identifier (e.g., "customer_name")
    Labels   map[string]string // i18n: {"es": "Nombre", "en": "Name"}
    DataType ValueType         // Expected cell value type
    Width    *string           // Optional: "100px", "20%"
    Format   *string           // Optional: format pattern
}
```

### TableStyles

```go
type TableStyles struct {
    FontFamily *string  // "Arial", "Times New Roman"
    FontSize   *int     // pixels
    FontWeight *string  // "normal", "bold"
    TextColor  *string  // "#333333"
    TextAlign  *string  // "left", "center", "right"
    Background *string  // "#f5f5f5" (headers)
}

// Apply styles
table.WithHeaderStyles(sdk.TableStyles{...})
table.WithBodyStyles(sdk.TableStyles{...})
```

### TableSchemaProvider (Optional)

Implement to expose column schema to editor:

```go
func (i *MyTableInjector) ColumnSchema() []sdk.TableColumn {
    return []sdk.TableColumn{
        {Key: "item", Labels: map[string]string{"en": "Item"}, DataType: sdk.ValueTypeString},
        {Key: "price", Labels: map[string]string{"en": "Price"}, DataType: sdk.ValueTypeNumber},
    }
}
```

---

## Lists API

### List Basic Usage

```go
list := sdk.NewListValue().
    WithSymbol(sdk.ListSymbolBullet).
    WithHeaderLabel(map[string]string{
        "es": "Requisitos del documento",
        "en": "Document Requirements",
    }).
    AddNestedItem(sdk.StringValue("Identification"),
        sdk.ListItemValue(sdk.StringValue("Valid government ID")),
        sdk.ListItemValue(sdk.StringValue("Proof of address")),
    ).
    AddNestedItem(sdk.StringValue("Financial Information"),
        sdk.ListItemValue(sdk.StringValue("Bank statements (last 3 months)")),
        sdk.ListItemNested(sdk.StringValue("Tax Returns"),
            sdk.ListItemValue(sdk.StringValue("Federal")),
            sdk.ListItemValue(sdk.StringValue("State/Provincial")),
        ),
    ).
    WithHeaderStyles(sdk.ListStyles{
        FontWeight: sdk.StringPtr("bold"),
        FontSize:   sdk.IntPtr(14),
    })

return &sdk.InjectorResult{Value: sdk.ListValueData(list)}, nil
```

### List Symbols

```go
sdk.ListSymbolBullet  // • (default)
sdk.ListSymbolNumber  // 1. 2. 3.
sdk.ListSymbolDash    // – (en-dash)
sdk.ListSymbolRoman   // i. ii. iii.
sdk.ListSymbolLetter  // a) b) c)
```

### List Methods

```go
NewListValue() *ListValue
WithSymbol(symbol ListSymbol) *ListValue
WithHeaderLabel(labels map[string]string) *ListValue
AddItem(value InjectableValue) *ListValue                           // Simple item
AddNestedItem(value InjectableValue, children ...ListItem) *ListValue  // Item with children
WithHeaderStyles(styles ListStyles) *ListValue
WithItemStyles(styles ListStyles) *ListValue
```

### Item Helpers

```go
sdk.ListItemValue(value InjectableValue) ListItem                    // Simple child
sdk.ListItemNested(value InjectableValue, children ...ListItem) ListItem  // Nested child
```

### ListStyles

```go
type ListStyles struct {
    FontFamily *string
    FontSize   *int
    FontWeight *string
    TextColor  *string
    TextAlign  *string
}
```

### ListSchemaProvider (Optional)

```go
func (i *MyListInjector) ListSchema() sdk.ListSchema {
    return sdk.ListSchema{
        Symbol: sdk.ListSymbolBullet,
        HeaderLabel: map[string]string{
            "es": "Requisitos",
            "en": "Requirements",
        },
    }
}
```

---

## Images

```go
// Return image URL - system downloads and caches automatically
return &sdk.InjectorResult{
    Value: sdk.ImageValue("https://example.com/logo.png"),
}, nil
```

**Behavior**:

- URLs are downloaded and cached to disk
- Cache has TTL with auto-cleanup
- Download failure → 1x1 gray PNG placeholder (non-critical)

---

## FormatConfig

### Structure

```go
type FormatConfig struct {
    Default string   // Default format if none selected
    Options []string // Available format patterns
}
```

### Injector Example

```go
func (i *InvoiceDateInjector) Formats() *sdk.FormatConfig {
    return &sdk.FormatConfig{
        Default: "DD/MM/YYYY",
        Options: []string{"DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMMM YYYY"},
    }
}
```

### Access Selected Format

```go
format := injCtx.SelectedFormat("invoice_date")
// Returns: "DD/MM/YYYY", "MM/DD/YYYY", etc.
```

### Format Presets

#### Date

| Pattern        | Example           |
| -------------- | ----------------- |
| `DD/MM/YYYY`   | 25/12/2024        |
| `MM/DD/YYYY`   | 12/25/2024        |
| `YYYY-MM-DD`   | 2024-12-25        |
| `D MMMM YYYY`  | 25 December 2024  |
| `MMMM D, YYYY` | December 25, 2024 |
| `DD MMM YYYY`  | 25 Dec 2024       |

#### Time

| Pattern      | Example     |
| ------------ | ----------- |
| `HH:mm`      | 14:30       |
| `HH:mm:ss`   | 14:30:45    |
| `hh:mm a`    | 02:30 PM    |
| `hh:mm:ss a` | 02:30:45 PM |

#### DateTime

Combine date and time patterns:

- `DD/MM/YYYY HH:mm`
- `YYYY-MM-DD HH:mm:ss`
- `D MMMM YYYY, HH:mm`

#### Number

| Pattern     | Example   |
| ----------- | --------- |
| `#,##0.00`  | 1,234.56  |
| `#,##0`     | 1,235     |
| `#,##0.000` | 1,234.560 |
| `0.00`      | 1234.56   |

#### Currency

| Pattern        | Example      |
| -------------- | ------------ |
| `$#,##0.00`    | $1,234.56    |
| `€#,##0.00`    | €1,234.56    |
| `#,##0.00 USD` | 1,234.56 USD |

#### Percentage

| Pattern     | Example |
| ----------- | ------- |
| `#,##0.00%` | 12.50%  |
| `#,##0%`    | 13%     |
| `#,##0.0%`  | 12.5%   |

#### Phone

| Pattern           | Example         |
| ----------------- | --------------- |
| `+## # #### ####` | +56 9 1234 5678 |
| `(###) ###-####`  | (912) 345-6789  |
| `### ### ####`    | 912 345 6789    |

#### RUT (Chile)

| Pattern        | Example      |
| -------------- | ------------ |
| `##.###.###-#` | 12.345.678-9 |
| `########-#`   | 12345678-9   |

#### Boolean

| Pattern      | True | False |
| ------------ | ---- | ----- |
| `Yes/No`     | Yes  | No    |
| `True/False` | True | False |
| `Sí/No`      | Sí   | No    |

---

## WorkspaceInjectableProvider

For dynamic, workspace-specific injectables that vary at runtime.

### Provider Interface

```go
type WorkspaceInjectableProvider interface {
    // Called when editor opens - list available injectables
    GetInjectables(ctx context.Context, req *GetInjectablesRequest) (*GetInjectablesResult, error)

    // Called during render - resolve values
    ResolveInjectables(ctx context.Context, req *ResolveInjectablesRequest) (*ResolveInjectablesResult, error)
}
```

### GetInjectablesRequest

```go
type GetInjectablesRequest struct {
    TenantCode    string // e.g., "acme-corp"
    WorkspaceCode string // e.g., "sales-team"
    Locale        string // e.g., "es", "en"
}
```

### GetInjectablesResult

```go
type GetInjectablesResult struct {
    Injectables []ProviderInjectable
    Groups      []ProviderGroup
}
```

### ProviderInjectable

```go
type ProviderInjectable struct {
    Code        string           // REQUIRED: unique identifier
    Label       string           // REQUIRED: display name (pre-translated)
    Description string           // Optional: help text (pre-translated)
    DataType    ValueType        // REQUIRED: value type
    GroupKey    string           // Optional: group assignment
    Formats     []ProviderFormat // Optional: format options
}
```

### ProviderFormat

```go
type ProviderFormat struct {
    Key   string // Format identifier (passed back in ResolveInjectablesRequest)
    Label string // Display label (pre-translated)
}
```

### ProviderGroup

```go
type ProviderGroup struct {
    Key  string // REQUIRED: unique group identifier
    Name string // REQUIRED: display name (pre-translated)
    Icon string // Optional: icon name ("calendar", "user", "database")
}
```

### ResolveInjectablesRequest

```go
type ResolveInjectablesRequest struct {
    TenantCode      string
    WorkspaceCode   string
    TemplateID      string
    Codes           []string          // Injectable codes to resolve
    SelectedFormats map[string]string // code → format key
    Headers         map[string]string // HTTP headers
    Payload         any               // Request body data
    InitData        any               // From InitFunc
}
```

### ResolveInjectablesResult

```go
type ResolveInjectablesResult struct {
    Values map[string]*InjectableValue // Resolved values
    Errors map[string]string            // Non-critical errors (render continues)
}
```

### Error Handling

| Return                                     | Behavior                            |
| ------------------------------------------ | ----------------------------------- |
| `(nil, error)`                             | CRITICAL: stops render              |
| `(result, nil)` with `result.Errors[code]` | NON-CRITICAL: logs error, continues |

### Complete Example

```go
type CRMProvider struct {
    client *crmapi.Client
}

func (p *CRMProvider) GetInjectables(ctx context.Context, req *sdk.GetInjectablesRequest) (*sdk.GetInjectablesResult, error) {
    // Translate based on locale
    customerLabel := "Nombre del Cliente"
    if req.Locale == "en" {
        customerLabel = "Customer Name"
    }

    return &sdk.GetInjectablesResult{
        Injectables: []sdk.ProviderInjectable{
            {
                Code:        "crm_customer_name",
                Label:       customerLabel,
                Description: "Full customer name from CRM",
                DataType:    sdk.ValueTypeString,
                GroupKey:    "crm_data",
            },
            {
                Code:     "crm_balance",
                Label:    "Account Balance",
                DataType: sdk.ValueTypeNumber,
                GroupKey: "crm_data",
                Formats: []sdk.ProviderFormat{
                    {Key: "$#,##0.00", Label: "$1,234.56"},
                    {Key: "€#,##0.00", Label: "€1,234.56"},
                },
            },
        },
        Groups: []sdk.ProviderGroup{
            {Key: "crm_data", Name: "CRM Data", Icon: "database"},
        },
    }, nil
}

func (p *CRMProvider) ResolveInjectables(ctx context.Context, req *sdk.ResolveInjectablesRequest) (*sdk.ResolveInjectablesResult, error) {
    values := make(map[string]*sdk.InjectableValue)
    errors := make(map[string]string)

    // Get customer ID from payload
    payload := req.Payload.(map[string]any)
    customerID := payload["customer_id"].(string)

    // Fetch from CRM
    customer, err := p.client.GetCustomer(ctx, customerID)
    if err != nil {
        // Critical error - stop render
        return nil, fmt.Errorf("CRM unavailable: %w", err)
    }

    for _, code := range req.Codes {
        switch code {
        case "crm_customer_name":
            val := sdk.StringValue(customer.FullName)
            values[code] = &val
        case "crm_balance":
            val := sdk.NumberValue(customer.Balance)
            values[code] = &val
        default:
            // Non-critical - log and continue
            errors[code] = fmt.Sprintf("unknown code: %s", code)
        }
    }

    return &sdk.ResolveInjectablesResult{
        Values: values,
        Errors: errors,
    }, nil
}
```

---

## RequestMapper

### Mapper Interface

```go
type RequestMapper interface {
    Map(ctx context.Context, mapCtx *MapperContext) (any, error)
}
```

### MapperContext

```go
type MapperContext struct {
    ExternalID      string            // External request ID
    TemplateID      string            // Template to render
    TransactionalID string            // Traceability ID
    Operation       string            // Operation type
    Headers         map[string]string // HTTP headers
    RawBody         []byte            // Unparsed request body
}
```

### RequestMapper Example

```go
type InvoiceMapper struct{}

type InvoicePayload struct {
    CustomerID string  `json:"customer_id"`
    Amount     float64 `json:"amount"`
    DueDate    string  `json:"due_date"`
}

func (m *InvoiceMapper) Map(ctx context.Context, mapCtx *sdk.MapperContext) (any, error) {
    var payload InvoicePayload
    if err := json.Unmarshal(mapCtx.RawBody, &payload); err != nil {
        return nil, fmt.Errorf("invalid JSON: %w", err)
    }
    return &payload, nil
}

// Access in injector:
// payload := injCtx.RequestPayload().(*InvoicePayload)
```

---

## InitFunc

### Signature

```go
type InitFunc func(ctx context.Context, injCtx *InjectorContext) (any, error)
```

### InitFunc Example

```go
type SharedData struct {
    Config   *AppConfig
    DBClient *sql.DB
}

func MyInit() sdk.InitFunc {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
        config, err := loadConfig()
        if err != nil {
            return nil, err
        }

        db, err := sql.Open("postgres", config.DatabaseURL)
        if err != nil {
            return nil, err
        }

        return &SharedData{
            Config:   config,
            DBClient: db,
        }, nil
    }
}

// Access in injector:
// shared := injCtx.InitData().(*SharedData)
// rows, _ := shared.DBClient.QueryContext(ctx, "SELECT ...")
```

---

## Helpers

```go
sdk.StringPtr(s string) *string  // Create pointer to string
sdk.IntPtr(i int) *int           // Create pointer to int
```

Usage:

```go
table.WithHeaderStyles(sdk.TableStyles{
    FontWeight: sdk.StringPtr("bold"),
    FontSize:   sdk.IntPtr(14),
})
```
