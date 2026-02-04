# Extensions Reference

Detailed examples for pdf-forge extension points. For quick reference, see **SKILL.md**.

## WorkspaceInjectableProvider

For dynamic, workspace-specific injectables (e.g., from CRM, external APIs):

```go
type MyProvider struct{}

func (p *MyProvider) GetInjectables(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.GetInjectablesResult, error) {
    // Called when editor opens - use injCtx.TenantCode(), injCtx.WorkspaceCode()
    return &sdk.GetInjectablesResult{
        Injectables: []sdk.ProviderInjectable{
            {
                Code: "crm_customer_name",
                Label: map[string]string{
                    "es": "Nombre del Cliente",
                    "en": "Customer Name",
                },
                Description: map[string]string{
                    "es": "Nombre desde CRM",
                    "en": "Name from CRM",
                },
                DataType: sdk.InjectableDataTypeText,
                GroupKey: "crm_data",
            },
        },
        Groups: []sdk.ProviderGroup{
            {
                Key: "crm_data",
                Name: map[string]string{
                    "es": "Datos CRM",
                    "en": "CRM Data",
                },
                Icon: "database",
            },
        },
    }, nil
}

func (p *MyProvider) ResolveInjectables(ctx context.Context, req *sdk.ResolveInjectablesRequest) (*sdk.ResolveInjectablesResult, error) {
    values := make(map[string]*sdk.InjectableValue)
    for _, code := range req.Codes {
        if code == "crm_customer_name" {
            val := sdk.StringValue("John Doe")
            values[code] = &val
        }
    }
    return &sdk.ResolveInjectablesResult{Values: values}, nil
}
```

**Register**: `engine.SetWorkspaceInjectableProvider(&MyProvider{})`

**i18n**: Return all locales in `map[string]string`. Framework picks based on `?locale=` param.

See **types-reference.md** for complete interface details.

---

## Custom Render Authentication

By default, render uses OIDC (panel + render_providers). For custom auth (API keys, custom JWT):

### API Key Example

```go
type APIKeyAuth struct {
    keys map[string]string // apiKey → userID
}

func (a *APIKeyAuth) Authenticate(c *gin.Context) (*sdk.RenderAuthClaims, error) {
    apiKey := c.GetHeader("X-API-Key")
    if apiKey == "" {
        return nil, errors.New("missing API key")
    }
    userID, ok := a.keys[apiKey]
    if !ok {
        return nil, errors.New("invalid API key")
    }
    return &sdk.RenderAuthClaims{
        UserID:   userID,
        Provider: "api-key",
        Extra:    map[string]any{"key_prefix": apiKey[:8]},
    }, nil
}
```

### Custom JWT Example

```go
type CustomJWTAuth struct {
    secret []byte
}

func (a *CustomJWTAuth) Authenticate(c *gin.Context) (*sdk.RenderAuthClaims, error) {
    tokenStr := extractBearerToken(c)
    if tokenStr == "" {
        return nil, errors.New("missing token")
    }
    claims, err := jwt.Parse(tokenStr, a.secret)
    if err != nil {
        return nil, err
    }
    return &sdk.RenderAuthClaims{
        UserID:   claims["sub"].(string),
        Email:    claims["email"].(string),
        Provider: "custom-jwt",
    }, nil
}
```

### Hybrid Authentication (Bearer + API Key fallback)

```go
type HybridAuth struct {
    oidcValidator *OIDCValidator
    apiKeys       map[string]string
}

func (a *HybridAuth) Authenticate(c *gin.Context) (*sdk.RenderAuthClaims, error) {
    // Try Bearer token first
    if token := c.GetHeader("Authorization"); strings.HasPrefix(token, "Bearer ") {
        claims, err := a.oidcValidator.Validate(token[7:])
        if err == nil {
            return &sdk.RenderAuthClaims{
                UserID:   claims.Subject,
                Email:    claims.Email,
                Provider: "oidc",
            }, nil
        }
    }
    // Fallback to API key
    if key := c.GetHeader("X-API-Key"); key != "" {
        if userID, ok := a.apiKeys[key]; ok {
            return &sdk.RenderAuthClaims{
                UserID:   userID,
                Provider: "api-key",
            }, nil
        }
    }
    return nil, errors.New("no valid credentials")
}
```

### Register and Access Claims

```go
// Register
engine.SetRenderAuthenticator(&APIKeyAuth{keys: myKeys})

// Access in middleware/controllers
userID, _ := c.Get("user_id")
extra := middleware.GetRenderAuthExtra(c) // map[string]any from Extra
```

### Behavior

| Custom Auth Registered | Result                                          |
| ---------------------- | ----------------------------------------------- |
| NO                     | Uses OIDC (panel + render_providers)            |
| YES                    | Uses custom auth, OIDC render_providers ignored |

**Panel OIDC always works** for login/UI, independent of custom render auth.

---

## Custom Middleware

### Global Middleware (all routes)

Runs after CORS, before auth:

```go
engine.UseMiddleware(func(c *gin.Context) {
    start := time.Now()
    c.Next()
    slog.InfoContext(c.Request.Context(), "request",
        slog.Duration("latency", time.Since(start)))
})
```

### API Middleware (/api/v1/\* only)

Runs after auth, user context available:

```go
engine.UseAPIMiddleware(func(c *gin.Context) {
    // c.Get("user_id"), c.Get("tenant_id"), c.Get("workspace_id")
    c.Next()
})
```

### Execution Order

```plaintext
Global: Recovery → Logger → CORS → [User Global] → Routes
API:    Operation → Auth → Identity → Roles → [User API] → Controller
```

---

## Lifecycle Hooks

### OnStart (before HTTP server)

```go
engine.OnStart(func(ctx context.Context) error {
    slog.InfoContext(ctx, "app starting")
    return nil
})
```

### OnShutdown (after HTTP server stops)

```go
engine.OnShutdown(func(ctx context.Context) error {
    slog.InfoContext(ctx, "app stopping")
    return nil
})
```

### Background Processes Pattern

Both hooks are **synchronous**. For background processes, spawn a goroutine:

```go
var (
    schedulerCtx    context.Context
    schedulerCancel context.CancelFunc
    schedulerDone   chan struct{}
)

engine.OnStart(func(ctx context.Context) error {
    schedulerCtx, schedulerCancel = context.WithCancel(context.Background())
    schedulerDone = make(chan struct{})

    go func() {
        defer close(schedulerDone)
        myScheduler.Run(schedulerCtx)  // blocking call in goroutine
    }()

    return nil  // return immediately
})

engine.OnShutdown(func(ctx context.Context) error {
    schedulerCancel()    // signal scheduler to stop
    <-schedulerDone      // wait for clean exit
    return nil
})
```

### Anti-Pattern

```go
// ❌ WRONG: Blocking call in OnStart - server never starts!
engine.OnStart(func(ctx context.Context) error {
    myScheduler.Run(ctx)  // blocks forever
    return nil
})
```

---

## RequestMapper

Parses HTTP request body for injectors:

```go
type MyMapper struct{}

func (m *MyMapper) Map(ctx context.Context, mapCtx *sdk.MapperContext) (any, error) {
    var payload map[string]any
    if err := json.Unmarshal(mapCtx.RawBody, &payload); err != nil {
        return nil, err
    }
    return payload, nil
}
```

**Register**: `engine.SetMapper(&MyMapper{})`

**Access**: `injCtx.RequestPayload().(map[string]any)`

---

## InitFunc

Runs once before all injectors. Use for shared setup:

```go
func MyInit() sdk.InitFunc {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
        customer, err := loadCustomer(injCtx.ExternalID())
        if err != nil {
            return nil, err
        }
        return customer, nil
    }
}
```

**Register**: `engine.SetInitFunc(MyInit())`

**Access**: `injCtx.InitData().(*Customer)`

---

## i18n (Translations)

Define injectable labels in `config/injectors.i18n.yaml`:

```yaml
customer_name:
  name:
    en: "Customer Name"
    es: "Nombre del Cliente"
  description:
    en: "Full customer name"
    es: "Nombre completo del cliente"

groups:
  - key: billing
    name:
      en: "Billing"
      es: "Facturación"
    icon: "receipt"
```

---

## What's NOT Supported

| Feature              | Status  | Alternative                             |
| -------------------- | ------- | --------------------------------------- |
| Custom middleware    | ✅      | `UseMiddleware()`, `UseAPIMiddleware()` |
| Lifecycle hooks      | ✅      | `OnStart()`, `OnShutdown()`             |
| Custom HTTP routes   | ❌      | Deploy separate service                 |
| Multi-OIDC providers | ✅      | Config `auth.render_providers`          |
| Database hooks       | ❌      | Use `InitFunc` for pre-load             |
| Custom env prefix    | ❌      | Use `DOC_ENGINE_*` (hardcoded)          |
| Request interception | Partial | `SetMapper()` + middleware              |
| Custom log handlers  | ❌      | Config `logging.level`/`format`         |

See **enterprise-scenarios.md** for workarounds and patterns.
