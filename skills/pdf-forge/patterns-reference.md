# Patterns Reference

Best practices, patterns, and anti-patterns for pdf-forge development.

## Logging

### Rule: ALWAYS Use Context-Aware Logging

```go
// ✅ Correct - includes request context (tenant, user, operation ID)
slog.InfoContext(ctx, "processing template",
    slog.String("tenant_id", tenantID),
    slog.String("template_id", templateID),
    slog.String("operation", "render"))

slog.ErrorContext(ctx, "render failed",
    slog.Any("error", err),
    slog.String("template_id", templateID))

// ❌ Wrong - loses all request context
slog.Info("processing template")
slog.Error("render failed", slog.Any("error", err))
```

### Log Levels

| Level   | Use Case                                 |
| ------- | ---------------------------------------- |
| `debug` | Detailed execution flow, variable values |
| `info`  | Normal operations, milestones            |
| `warn`  | Recoverable issues, degraded behavior    |
| `error` | Failures requiring attention             |

### Structured Fields

Always include relevant identifiers:

```go
slog.InfoContext(ctx, "injectable resolved",
    slog.String("code", code),
    slog.String("tenant_id", injCtx.TenantCode()),
    slog.String("workspace_id", injCtx.WorkspaceCode()),
    slog.Duration("duration", elapsed))
```

### Configuration

```yaml
logging:
  level: info # debug, info, warn, error
  format: json # json, text
```

## Error Handling

### Critical vs Non-Critical Injectors

| `IsCritical()` | On Error                                    | Use Case                                      |
| -------------- | ------------------------------------------- | --------------------------------------------- |
| `true`         | Abort render, return error                  | Required data (customer name, invoice number) |
| `false`        | Log warning, use `DefaultValue()`, continue | Optional data (logo, watermark)               |

### Non-Critical with Fallback

```go
type CompanyLogoInjector struct{}

func (i *CompanyLogoInjector) Code() string { return "company_logo" }

func (i *CompanyLogoInjector) IsCritical() bool { return false }

func (i *CompanyLogoInjector) DefaultValue() *sdk.InjectableValue {
    val := sdk.ImageValue("https://cdn.example.com/default-logo.png")
    return &val
}

func (i *CompanyLogoInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        logoURL, err := fetchCompanyLogo(ctx, injCtx.TenantCode())
        if err != nil {
            // Will use DefaultValue() and continue
            return nil, fmt.Errorf("failed to fetch logo: %w", err)
        }
        return &sdk.InjectorResult{Value: sdk.ImageValue(logoURL)}, nil
    }, nil
}
```

### Critical with Proper Error

```go
type CustomerNameInjector struct{}

func (i *CustomerNameInjector) IsCritical() bool { return true }

func (i *CustomerNameInjector) DefaultValue() *sdk.InjectableValue { return nil }

func (i *CustomerNameInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        payload := injCtx.RequestPayload().(map[string]any)
        name, ok := payload["customer_name"].(string)
        if !ok || name == "" {
            // Will abort render
            return nil, fmt.Errorf("customer_name is required")
        }
        return &sdk.InjectorResult{Value: sdk.StringValue(name)}, nil
    }, nil
}
```

### Error Wrapping

```go
// ✅ Correct - wrap with context
if err != nil {
    return nil, fmt.Errorf("fetch customer %s: %w", customerID, err)
}

// ❌ Wrong - loses original error
if err != nil {
    return nil, errors.New("fetch failed")
}
```

## Context Usage

### Always Pass Context

```go
func (i *MyInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        // ✅ Pass ctx to all external calls
        data, err := externalAPI.Fetch(ctx, id)
        if err != nil {
            return nil, err
        }

        // ✅ Pass ctx to database calls
        record, err := db.QueryContext(ctx, query, args...)

        return &sdk.InjectorResult{Value: sdk.StringValue(data)}, nil
    }, nil
}
```

### Respect Cancellation

```go
func (i *MyInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        // For long operations, check context periodically
        for _, item := range items {
            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            default:
            }

            processItem(ctx, item)
        }

        return &sdk.InjectorResult{Value: result}, nil
    }, nil
}
```

### Custom Timeout

Default: 30 seconds per injector. Override for slow operations:

```go
func (i *SlowAPIInjector) Timeout() time.Duration {
    return 60 * time.Second  // Allow 60s for this injector
}
```

## Concurrency Patterns

### Understanding the Render Pipeline

```plaintext
1. Request arrives
2. Acquire semaphore slot (max_concurrent)
   └─ If no slot available within acquire_timeout → ErrRendererBusy
3. Run InitFunc (once per request)
4. Resolve injectables (topological order)
   └─ Level 0: No dependencies → run in parallel
   └─ Level 1: Depends on level 0 → wait, then run in parallel
   └─ Level N: ...
5. Build Typst source
6. Run Typst CLI → PDF
7. Release semaphore slot
```

### Safe Shared State in InitFunc

```go
type SharedData struct {
    Customer *Customer
    Settings *Settings
}

func MyInit() sdk.InitFunc {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
        // Load all shared data ONCE
        customer, err := loadCustomer(ctx, injCtx.ExternalID())
        if err != nil {
            return nil, err
        }

        settings, err := loadSettings(ctx, injCtx.TenantCode())
        if err != nil {
            return nil, err
        }

        return &SharedData{
            Customer: customer,
            Settings: settings,
        }, nil
    }
}
```

### Accessing Shared Data

```go
func (i *MyInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        // Access shared data from InitFunc
        shared := injCtx.InitData().(*SharedData)

        // Use without additional DB calls
        return &sdk.InjectorResult{
            Value: sdk.StringValue(shared.Customer.Name),
        }, nil
    }, nil
}
```

### DO NOT: Global State

```go
// ❌ Wrong - race conditions, memory leaks
var globalCache = make(map[string]any)

func (i *BadInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        globalCache[injCtx.TenantCode()] = someData  // RACE CONDITION
        return ...
    }, nil
}
```

## Request Validation

### In RequestMapper

```go
type ValidatingMapper struct{}

func (m *ValidatingMapper) Map(ctx context.Context, mapCtx *sdk.MapperContext) (any, error) {
    var payload struct {
        CustomerID   string `json:"customer_id"`
        DocumentType string `json:"document_type"`
    }

    if err := json.Unmarshal(mapCtx.RawBody, &payload); err != nil {
        return nil, fmt.Errorf("invalid JSON: %w", err)
    }

    // Validate required fields
    if payload.CustomerID == "" {
        return nil, errors.New("customer_id is required")
    }

    if payload.DocumentType == "" {
        return nil, errors.New("document_type is required")
    }

    return payload, nil
}
```

### In Injectors

```go
func (i *MyInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        payload := injCtx.RequestPayload().(MyPayload)

        // Validate specific to this injectable
        if payload.Amount < 0 {
            return nil, errors.New("amount cannot be negative")
        }

        return &sdk.InjectorResult{Value: sdk.NumberValue(payload.Amount)}, nil
    }, nil
}
```

## Anti-Patterns

| ❌ Don't                                  | ✅ Do                                     | Why                      |
| ----------------------------------------- | ----------------------------------------- | ------------------------ |
| `slog.Info(...)`                          | `slog.InfoContext(ctx, ...)`              | Loses request context    |
| Ignore `ctx.Done()`                       | Check in loops/long ops                   | Request may be cancelled |
| `IsCritical()=true` + no `DefaultValue()` | Add fallback OR handle error              | Unclear failure behavior |
| Global variables                          | Use `InitData`/`InjectorContext`          | Race conditions          |
| Complex validation in mapper              | Use middleware for request validation     | Cleaner separation       |
| Custom env prefix                         | Accept `DOC_ENGINE_*`                     | Hardcoded                |
| Swallow errors                            | Return or log with context                | Silent failures          |
| `errors.New("failed")`                    | `fmt.Errorf("op failed: %w", err)`        | Loses error chain        |
| Unbuffered semaphores                     | `make(chan struct{}, N)`                  | Deadlocks                |
| Missing `defer` for cleanup               | Always defer release/close                | Resource leaks           |
| N+1 queries in injectors                  | Load once in `InitFunc`                   | Performance              |
| Block in `OnStart`                        | Spawn goroutine for background processes  | Server never starts      |
| Skip `OnShutdown` cleanup                 | Cancel context + wait for goroutine       | Orphaned processes       |
| `engine.RegisterMapper()`                 | `engine.SetMapper()`                      | Deprecated naming        |

## Testing Patterns

### Mock External Dependencies

```go
type MockCRMClient struct {
    customers map[string]*Customer
}

func (m *MockCRMClient) GetCustomer(ctx context.Context, id string) (*Customer, error) {
    if c, ok := m.customers[id]; ok {
        return c, nil
    }
    return nil, errors.New("not found")
}
```

### Test Injector Resolution

```go
func TestCustomerNameInjector(t *testing.T) {
    inj := &CustomerNameInjector{}

    resolveFn, deps := inj.Resolve()
    assert.Empty(t, deps)

    ctx := context.Background()
    injCtx := &sdk.InjectorContext{
        // Mock context...
    }

    result, err := resolveFn(ctx, injCtx)
    assert.NoError(t, err)
    assert.Equal(t, "John Doe", result.Value.String())
}
```

## Code Organization

```plaintext
extensions/
  injectors/
    customer.go       # CustomerNameInjector, CustomerAddressInjector
    invoice.go        # InvoiceNumberInjector, InvoiceTotalInjector
    common.go         # Shared helpers
  mapper.go           # RequestMapper implementation
  init.go             # InitFunc implementation
  provider.go         # WorkspaceInjectableProvider implementation
```

### One File Per Domain

Group related injectors:

```go
// extensions/injectors/customer.go
type CustomerNameInjector struct{}
type CustomerAddressInjector struct{}
type CustomerEmailInjector struct{}

// All share same data source, logical grouping
```
