# Enterprise Integration Scenarios

Complete, copy-paste-ready implementations for common enterprise use cases.

## Scenario A: CRM Integration

Fetch customer data from external CRM (Salesforce, HubSpot, etc.) and expose as workspace injectables.

### Implementation (CRM Integration)

```go
// extensions/provider.go
package extensions

import (
    "context"
    "fmt"

    "github.com/rendis/pdf-forge/sdk"
)

type CRMWorkspaceProvider struct {
    crmClient CRMClient
}

type CRMClient interface {
    GetCustomerFields(ctx context.Context, workspaceID string) ([]CustomerField, error)
    GetCustomer(ctx context.Context, customerID string) (*Customer, error)
}

type CustomerField struct {
    Code  string
    Label map[string]string // locale -> label
    Type  string
}

type Customer struct {
    ID      string
    Name    string
    Email   string
    Phone   string
    Address string
    Custom  map[string]any
}

func NewCRMWorkspaceProvider(client CRMClient) *CRMWorkspaceProvider {
    return &CRMWorkspaceProvider{crmClient: client}
}

// GetInjectables - called when editor opens
func (p *CRMWorkspaceProvider) GetInjectables(
    ctx context.Context,
    req *sdk.GetInjectablesRequest,
) (*sdk.GetInjectablesResult, error) {

    fields, err := p.crmClient.GetCustomerFields(ctx, req.WorkspaceCode)
    if err != nil {
        return nil, fmt.Errorf("fetch CRM fields: %w", err)
    }

    injectables := make([]sdk.ProviderInjectable, 0, len(fields))
    for _, f := range fields {
        label := f.Label[req.Locale]
        if label == "" {
            label = f.Label["en"] // fallback
        }

        injectables = append(injectables, sdk.ProviderInjectable{
            Code:     "crm_" + f.Code,
            Label:    label,
            DataType: mapCRMType(f.Type),
            GroupKey: "crm_data",
        })
    }

    return &sdk.GetInjectablesResult{
        Injectables: injectables,
        Groups: []sdk.ProviderGroup{
            {
                Key:  "crm_data",
                Name: localizedGroupName(req.Locale),
                Icon: "database",
            },
        },
    }, nil
}

// ResolveInjectables - called during render
func (p *CRMWorkspaceProvider) ResolveInjectables(
    ctx context.Context,
    req *sdk.ResolveInjectablesRequest,
) (*sdk.ResolveInjectablesResult, error) {

    // Get customer ID from request payload
    payload, ok := req.Payload.(map[string]any)
    if !ok {
        return nil, fmt.Errorf("invalid payload type")
    }

    customerID, ok := payload["customer_id"].(string)
    if !ok || customerID == "" {
        return nil, fmt.Errorf("customer_id is required")
    }

    // Fetch customer from CRM
    customer, err := p.crmClient.GetCustomer(ctx, customerID)
    if err != nil {
        return nil, fmt.Errorf("fetch customer %s: %w", customerID, err)
    }

    values := make(map[string]*sdk.InjectableValue)
    errors := make(map[string]string)

    for _, code := range req.Codes {
        val, err := p.resolveField(customer, code)
        if err != nil {
            errors[code] = err.Error()
            continue
        }
        values[code] = val
    }

    return &sdk.ResolveInjectablesResult{
        Values: values,
        Errors: errors,
    }, nil
}

func (p *CRMWorkspaceProvider) resolveField(c *Customer, code string) (*sdk.InjectableValue, error) {
    var val sdk.InjectableValue

    switch code {
    case "crm_name":
        val = sdk.StringValue(c.Name)
    case "crm_email":
        val = sdk.StringValue(c.Email)
    case "crm_phone":
        val = sdk.StringValue(c.Phone)
    case "crm_address":
        val = sdk.StringValue(c.Address)
    default:
        // Check custom fields
        if v, ok := c.Custom[code]; ok {
            val = sdk.StringValue(fmt.Sprint(v))
        } else {
            return nil, fmt.Errorf("unknown field: %s", code)
        }
    }

    return &val, nil
}

func mapCRMType(t string) sdk.ValueType {
    switch t {
    case "number", "currency":
        return sdk.ValueTypeNumber
    case "boolean":
        return sdk.ValueTypeBool
    case "date", "datetime":
        return sdk.ValueTypeTime
    default:
        return sdk.ValueTypeString
    }
}

func localizedGroupName(locale string) string {
    names := map[string]string{
        "en": "CRM Data",
        "es": "Datos CRM",
        "pt": "Dados CRM",
    }
    if n, ok := names[locale]; ok {
        return n
    }
    return names["en"]
}
```

### Registration (CRM Integration)

```go
func main() {
    crmClient := NewSalesforceClient(os.Getenv("SALESFORCE_TOKEN"))

    engine := sdk.New(
        sdk.WithConfigFile("config/app.yaml"),
    )

    engine.SetWorkspaceInjectableProvider(
        extensions.NewCRMWorkspaceProvider(crmClient),
    )

    if err := engine.Run(); err != nil {
        log.Fatal(err)
    }
}
```

---

## Scenario B: External Secrets (Vault/AWS)

Load secrets and config from HashiCorp Vault or AWS Secrets Manager in InitFunc.

### Implementation (External Secrets)

```go
// extensions/init.go
package extensions

import (
    "context"
    "fmt"
    "log/slog"

    "github.com/rendis/pdf-forge/sdk"
)

type SecretStore interface {
    GetSecret(ctx context.Context, path string) (map[string]string, error)
}

type SharedSecrets struct {
    APIKeys     map[string]string
    Credentials map[string]string
    Config      map[string]string
}

func NewSecretsInitFunc(store SecretStore) sdk.InitFunc {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
        tenantCode := injCtx.TenantCode()

        // Load tenant-specific secrets
        secretPath := fmt.Sprintf("pdfforge/tenants/%s", tenantCode)

        secrets, err := store.GetSecret(ctx, secretPath)
        if err != nil {
            slog.ErrorContext(ctx, "failed to load secrets",
                slog.String("tenant", tenantCode),
                slog.Any("error", err))
            return nil, fmt.Errorf("load secrets for tenant %s: %w", tenantCode, err)
        }

        slog.InfoContext(ctx, "secrets loaded",
            slog.String("tenant", tenantCode),
            slog.Int("count", len(secrets)))

        return &SharedSecrets{
            APIKeys:     filterPrefix(secrets, "api_key_"),
            Credentials: filterPrefix(secrets, "cred_"),
            Config:      filterPrefix(secrets, "config_"),
        }, nil
    }
}

func filterPrefix(m map[string]string, prefix string) map[string]string {
    result := make(map[string]string)
    for k, v := range m {
        if len(k) > len(prefix) && k[:len(prefix)] == prefix {
            result[k[len(prefix):]] = v
        }
    }
    return result
}
```

### Vault Client Example

```go
// extensions/vault_client.go
package extensions

import (
    "context"
    "fmt"

    vault "github.com/hashicorp/vault/api"
)

type VaultSecretStore struct {
    client *vault.Client
}

func NewVaultSecretStore(addr, token string) (*VaultSecretStore, error) {
    config := vault.DefaultConfig()
    config.Address = addr

    client, err := vault.NewClient(config)
    if err != nil {
        return nil, err
    }

    client.SetToken(token)

    return &VaultSecretStore{client: client}, nil
}

func (v *VaultSecretStore) GetSecret(ctx context.Context, path string) (map[string]string, error) {
    secret, err := v.client.KVv2("secret").Get(ctx, path)
    if err != nil {
        return nil, fmt.Errorf("vault get %s: %w", path, err)
    }

    result := make(map[string]string)
    for k, v := range secret.Data {
        if s, ok := v.(string); ok {
            result[k] = s
        }
    }

    return result, nil
}
```

### Using Secrets in Injector

```go
// extensions/injectors/external_api.go
package injectors

import (
    "context"
    "fmt"
    "net/http"

    "github.com/rendis/pdf-forge/sdk"
    "myproject/extensions"
)

type ExternalAPIInjector struct{}

func (i *ExternalAPIInjector) Code() string { return "external_data" }

func (i *ExternalAPIInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        // Get secrets from InitData
        secrets := injCtx.InitData().(*extensions.SharedSecrets)

        apiKey, ok := secrets.APIKeys["external_service"]
        if !ok {
            return nil, fmt.Errorf("missing API key for external_service")
        }

        // Use the API key
        req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.external.com/data", nil)
        req.Header.Set("Authorization", "Bearer "+apiKey)

        // ... make request and process response

        return &sdk.InjectorResult{Value: sdk.StringValue(result)}, nil
    }, nil
}
```

### Registration (External Secrets)

```go
func main() {
    vaultStore, err := extensions.NewVaultSecretStore(
        os.Getenv("VAULT_ADDR"),
        os.Getenv("VAULT_TOKEN"),
    )
    if err != nil {
        log.Fatal("vault init:", err)
    }

    engine := sdk.New(
        sdk.WithConfigFile("config/app.yaml"),
    )

    engine.SetInitFunc(extensions.NewSecretsInitFunc(vaultStore))
    engine.RegisterInjector(&injectors.ExternalAPIInjector{})

    if err := engine.Run(); err != nil {
        log.Fatal(err)
    }
}
```

---

## Scenario C: Request Validation

Validate and transform incoming render requests before processing.

### Implementation (Request Validation)

```go
// extensions/mapper.go
package extensions

import (
    "context"
    "encoding/json"
    "fmt"
    "regexp"
    "strings"

    "github.com/rendis/pdf-forge/sdk"
)

type RenderRequest struct {
    CustomerID   string         `json:"customer_id"`
    DocumentType string         `json:"document_type"`
    Locale       string         `json:"locale"`
    Data         map[string]any `json:"data"`
    Options      RenderOptions  `json:"options"`
}

type RenderOptions struct {
    IncludeLogo    bool `json:"include_logo"`
    IncludeFooter  bool `json:"include_footer"`
    WatermarkText  string `json:"watermark_text"`
}

var (
    validDocTypes = map[string]bool{
        "invoice": true,
        "quote": true,
        "contract": true,
        "receipt": true,
    }

    uuidRegex = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
)

type ValidatingMapper struct{}

func (m *ValidatingMapper) Map(ctx context.Context, mapCtx *sdk.MapperContext) (any, error) {
    var req RenderRequest

    // Parse JSON
    if err := json.Unmarshal(mapCtx.RawBody, &req); err != nil {
        return nil, fmt.Errorf("invalid JSON: %w", err)
    }

    // Validate required fields
    if err := m.validateRequired(&req); err != nil {
        return nil, err
    }

    // Validate field formats
    if err := m.validateFormats(&req); err != nil {
        return nil, err
    }

    // Sanitize input
    m.sanitize(&req)

    // Set defaults
    m.setDefaults(&req)

    return req, nil
}

func (m *ValidatingMapper) validateRequired(req *RenderRequest) error {
    var missing []string

    if req.CustomerID == "" {
        missing = append(missing, "customer_id")
    }
    if req.DocumentType == "" {
        missing = append(missing, "document_type")
    }

    if len(missing) > 0 {
        return fmt.Errorf("missing required fields: %s", strings.Join(missing, ", "))
    }

    return nil
}

func (m *ValidatingMapper) validateFormats(req *RenderRequest) error {
    // Validate customer_id is UUID
    if !uuidRegex.MatchString(req.CustomerID) {
        return fmt.Errorf("customer_id must be a valid UUID")
    }

    // Validate document_type is allowed
    if !validDocTypes[req.DocumentType] {
        return fmt.Errorf("invalid document_type: %s (allowed: invoice, quote, contract, receipt)", req.DocumentType)
    }

    // Validate locale if provided
    if req.Locale != "" && len(req.Locale) != 2 {
        return fmt.Errorf("locale must be 2-letter code (e.g., 'en', 'es')")
    }

    return nil
}

func (m *ValidatingMapper) sanitize(req *RenderRequest) {
    req.CustomerID = strings.TrimSpace(req.CustomerID)
    req.DocumentType = strings.TrimSpace(strings.ToLower(req.DocumentType))
    req.Locale = strings.TrimSpace(strings.ToLower(req.Locale))

    // Limit watermark length
    if len(req.Options.WatermarkText) > 50 {
        req.Options.WatermarkText = req.Options.WatermarkText[:50]
    }
}

func (m *ValidatingMapper) setDefaults(req *RenderRequest) {
    if req.Locale == "" {
        req.Locale = "en"
    }
    if req.Data == nil {
        req.Data = make(map[string]any)
    }
}
```

### Registration (Request Validation)

```go
func main() {
    engine := sdk.New(
        sdk.WithConfigFile("config/app.yaml"),
    )

    engine.RegisterMapper(&extensions.ValidatingMapper{})

    if err := engine.Run(); err != nil {
        log.Fatal(err)
    }
}
```

---

## Scenario D: Multi-Source Data Loading

Load data from multiple sources once in InitFunc, avoiding N+1 queries.

### Implementation (Multi-Source Data)

```go
// extensions/init.go
package extensions

import (
    "context"
    "fmt"
    "log/slog"
    "sync"

    "github.com/rendis/pdf-forge/sdk"
)

type MultiSourceData struct {
    Customer  *Customer
    Company   *Company
    Products  []*Product
    Settings  *TenantSettings
    Branding  *BrandingConfig
}

type DataSources struct {
    CustomerDB CustomerRepository
    ProductDB  ProductRepository
    ConfigSvc  ConfigService
    BrandingSvc BrandingService
}

func NewMultiSourceInitFunc(sources *DataSources) sdk.InitFunc {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
        payload := injCtx.RequestPayload().(map[string]any)

        customerID, _ := payload["customer_id"].(string)
        tenantCode := injCtx.TenantCode()
        workspaceCode := injCtx.WorkspaceCode()

        // Load all data in parallel
        var (
            wg       sync.WaitGroup
            mu       sync.Mutex
            errList  []error
            data     MultiSourceData
        )

        // Customer
        wg.Add(1)
        go func() {
            defer wg.Done()
            customer, err := sources.CustomerDB.GetByID(ctx, customerID)
            mu.Lock()
            defer mu.Unlock()
            if err != nil {
                errList = append(errList, fmt.Errorf("customer: %w", err))
                return
            }
            data.Customer = customer
        }()

        // Company (from customer's company_id)
        wg.Add(1)
        go func() {
            defer wg.Done()
            // Wait for customer first if needed, or use separate lookup
            companyID, _ := payload["company_id"].(string)
            company, err := sources.CustomerDB.GetCompany(ctx, companyID)
            mu.Lock()
            defer mu.Unlock()
            if err != nil {
                errList = append(errList, fmt.Errorf("company: %w", err))
                return
            }
            data.Company = company
        }()

        // Products
        wg.Add(1)
        go func() {
            defer wg.Done()
            productIDs, _ := payload["product_ids"].([]any)
            ids := make([]string, 0, len(productIDs))
            for _, id := range productIDs {
                if s, ok := id.(string); ok {
                    ids = append(ids, s)
                }
            }
            products, err := sources.ProductDB.GetByIDs(ctx, ids)
            mu.Lock()
            defer mu.Unlock()
            if err != nil {
                errList = append(errList, fmt.Errorf("products: %w", err))
                return
            }
            data.Products = products
        }()

        // Tenant settings
        wg.Add(1)
        go func() {
            defer wg.Done()
            settings, err := sources.ConfigSvc.GetTenantSettings(ctx, tenantCode)
            mu.Lock()
            defer mu.Unlock()
            if err != nil {
                errList = append(errList, fmt.Errorf("settings: %w", err))
                return
            }
            data.Settings = settings
        }()

        // Branding
        wg.Add(1)
        go func() {
            defer wg.Done()
            branding, err := sources.BrandingSvc.GetBranding(ctx, workspaceCode)
            mu.Lock()
            defer mu.Unlock()
            if err != nil {
                errList = append(errList, fmt.Errorf("branding: %w", err))
                return
            }
            data.Branding = branding
        }()

        wg.Wait()

        // Check for critical errors
        if len(errList) > 0 {
            for _, err := range errList {
                slog.ErrorContext(ctx, "init data load failed", slog.Any("error", err))
            }
            // Return first error (or aggregate)
            return nil, errList[0]
        }

        slog.InfoContext(ctx, "multi-source data loaded",
            slog.String("customer_id", customerID),
            slog.Int("products", len(data.Products)))

        return &data, nil
    }
}
```

### Injectors Using Shared Data

```go
// extensions/injectors/customer.go
package injectors

import (
    "context"

    "github.com/rendis/pdf-forge/sdk"
    "myproject/extensions"
)

type CustomerNameInjector struct{}

func (i *CustomerNameInjector) Code() string     { return "customer_name" }
func (i *CustomerNameInjector) IsCritical() bool { return true }

func (i *CustomerNameInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        data := injCtx.InitData().(*extensions.MultiSourceData)
        return &sdk.InjectorResult{
            Value: sdk.StringValue(data.Customer.FullName),
        }, nil
    }, nil
}

// extensions/injectors/products.go

type ProductTableInjector struct{}

func (i *ProductTableInjector) Code() string       { return "product_table" }
func (i *ProductTableInjector) DataType() sdk.ValueType { return sdk.ValueTypeTable }

func (i *ProductTableInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        data := injCtx.InitData().(*extensions.MultiSourceData)

        table := sdk.NewTableValue()
        table.AddColumn("name", map[string]string{"en": "Product", "es": "Producto"})
        table.AddColumn("qty", map[string]string{"en": "Qty", "es": "Cant."})
        table.AddColumn("price", map[string]string{"en": "Price", "es": "Precio"})

        for _, p := range data.Products {
            table.AddRow(
                sdk.Cell(p.Name),
                sdk.Cell(p.Quantity),
                sdk.Cell(p.Price),
            )
        }

        return &sdk.InjectorResult{Value: sdk.TableValueData(table)}, nil
    }, nil
}

// extensions/injectors/branding.go

type CompanyLogoInjector struct{}

func (i *CompanyLogoInjector) Code() string     { return "company_logo" }
func (i *CompanyLogoInjector) IsCritical() bool { return false }

func (i *CompanyLogoInjector) DefaultValue() *sdk.InjectableValue {
    val := sdk.ImageValue("https://cdn.example.com/default-logo.png")
    return &val
}

func (i *CompanyLogoInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        data := injCtx.InitData().(*extensions.MultiSourceData)

        if data.Branding == nil || data.Branding.LogoURL == "" {
            return nil, nil // Use DefaultValue
        }

        return &sdk.InjectorResult{
            Value: sdk.ImageValue(data.Branding.LogoURL),
        }, nil
    }, nil
}
```

---

## Scenario E: Custom Formatting Injector

Injector with multiple format options that the user selects in the editor.

### Implementation (Custom Formatting)

```go
// extensions/injectors/currency.go
package injectors

import (
    "context"
    "fmt"

    "github.com/rendis/pdf-forge/sdk"
    "golang.org/x/text/language"
    "golang.org/x/text/message"
    "golang.org/x/text/number"
)

type CurrencyInjector struct{}

func (i *CurrencyInjector) Code() string           { return "total_amount" }
func (i *CurrencyInjector) DataType() sdk.ValueType { return sdk.ValueTypeNumber }
func (i *CurrencyInjector) IsCritical() bool       { return true }

func (i *CurrencyInjector) Formats() *sdk.FormatConfig {
    return &sdk.FormatConfig{
        Default: "USD",
        Options: []string{
            "USD",      // $1,234.56
            "EUR",      // 1.234,56 €
            "GBP",      // £1,234.56
            "CLP",      // $1.234 (no decimals)
            "plain",    // 1234.56 (no formatting)
        },
    }
}

func (i *CurrencyInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        payload := injCtx.RequestPayload().(map[string]any)

        amount, ok := payload["amount"].(float64)
        if !ok {
            return nil, fmt.Errorf("amount is required and must be a number")
        }

        // Get user-selected format
        format := injCtx.SelectedFormat("total_amount")
        if format == "" {
            format = "USD"
        }

        formatted := formatCurrency(amount, format)

        return &sdk.InjectorResult{
            Value: sdk.StringValue(formatted),
            Metadata: map[string]any{
                "raw_amount": amount,
                "currency":   format,
            },
        }, nil
    }, nil
}

func formatCurrency(amount float64, currency string) string {
    switch currency {
    case "USD":
        p := message.NewPrinter(language.English)
        return p.Sprintf("$%s", formatNumber(amount, 2, ",", "."))
    case "EUR":
        p := message.NewPrinter(language.German)
        return p.Sprintf("%s €", formatNumber(amount, 2, ".", ","))
    case "GBP":
        return fmt.Sprintf("£%s", formatNumber(amount, 2, ",", "."))
    case "CLP":
        return fmt.Sprintf("$%s", formatNumber(amount, 0, ".", ""))
    case "plain":
        return fmt.Sprintf("%.2f", amount)
    default:
        return fmt.Sprintf("%.2f", amount)
    }
}

func formatNumber(n float64, decimals int, thousandsSep, decimalSep string) string {
    // Simplified - use proper library in production
    format := fmt.Sprintf("%%.%df", decimals)
    s := fmt.Sprintf(format, n)

    // Add thousands separator (basic implementation)
    parts := strings.Split(s, ".")
    intPart := parts[0]

    var result strings.Builder
    for i, c := range intPart {
        if i > 0 && (len(intPart)-i)%3 == 0 {
            result.WriteString(thousandsSep)
        }
        result.WriteRune(c)
    }

    if decimals > 0 && len(parts) > 1 {
        result.WriteString(decimalSep)
        result.WriteString(parts[1])
    }

    return result.String()
}
```

### Registration (Custom Formatting)

```go
func main() {
    engine := sdk.New(
        sdk.WithConfigFile("config/app.yaml"),
        sdk.WithI18nFile("config/injectors.i18n.yaml"),
    )

    engine.RegisterInjector(&injectors.CurrencyInjector{})

    if err := engine.Run(); err != nil {
        log.Fatal(err)
    }
}
```

### i18n Entry (injectors.i18n.yaml)

```yaml
total_amount:
  name:
    en: "Total Amount"
    es: "Monto Total"
  description:
    en: "Invoice total with currency formatting"
    es: "Total de factura con formato de moneda"
  formats:
    USD:
      en: "US Dollar ($1,234.56)"
      es: "Dólar estadounidense ($1,234.56)"
    EUR:
      en: "Euro (1.234,56 €)"
      es: "Euro (1.234,56 €)"
    GBP:
      en: "British Pound (£1,234.56)"
      es: "Libra esterlina (£1,234.56)"
    CLP:
      en: "Chilean Peso ($1.234)"
      es: "Peso chileno ($1.234)"
    plain:
      en: "Plain number (1234.56)"
      es: "Número sin formato (1234.56)"
```

---

## Scenario F: Custom Middleware

Rate limiting, request logging, tenant validation, and custom headers.

### Implementation (Middleware)

```go
// extensions/middleware.go
package extensions

import (
    "log/slog"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
    "golang.org/x/time/rate"
)

// =============================================================================
// GLOBAL MIDDLEWARE
// Applied to ALL routes (health, swagger, api, internal).
// Execution order: Recovery → Logger → CORS → [Your Middleware] → Routes
// Register with: engine.UseMiddleware(middleware)
// =============================================================================

// RequestLoggerMiddleware logs all requests with latency.
func RequestLoggerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        method := c.Request.Method

        c.Next()

        slog.InfoContext(c.Request.Context(), "http request",
            slog.String("method", method),
            slog.String("path", path),
            slog.Int("status", c.Writer.Status()),
            slog.Duration("latency", time.Since(start)),
            slog.String("client_ip", c.ClientIP()))
    }
}

// CustomHeadersMiddleware adds custom response headers.
func CustomHeadersMiddleware(headers map[string]string) gin.HandlerFunc {
    return func(c *gin.Context) {
        for k, v := range headers {
            c.Header(k, v)
        }
        c.Next()
    }
}

// =============================================================================
// API MIDDLEWARE
// Applied to /api/v1/* routes only, AFTER authentication.
// Execution order: Operation → Auth → Identity → Roles → [Your Middleware] → Controller
// At this point, you can access authenticated user context:
//   - c.Get("user_id")      → internal user ID
//   - c.Get("user_email")   → user email
//   - c.Get("tenant_id")    → tenant ID (from X-Tenant-ID header)
//   - c.Get("workspace_id") → workspace ID (from X-Workspace-ID header)
// Register with: engine.UseAPIMiddleware(middleware)
// =============================================================================

// RateLimitMiddleware limits requests per IP.
func RateLimitMiddleware(rps float64, burst int) gin.HandlerFunc {
    limiters := sync.Map{}

    return func(c *gin.Context) {
        ip := c.ClientIP()

        limiterI, _ := limiters.LoadOrStore(ip, rate.NewLimiter(rate.Limit(rps), burst))
        limiter := limiterI.(*rate.Limiter)

        if !limiter.Allow() {
            c.AbortWithStatusJSON(429, gin.H{
                "error":       "rate limit exceeded",
                "retry_after": "1s",
            })
            return
        }

        c.Next()
    }
}

// TenantValidationMiddleware validates tenant access.
// Runs after authentication, so user context is available.
func TenantValidationMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, _ := c.Get("user_id")
        tenantID := c.GetHeader("X-Tenant-ID")

        // Example: Log the authenticated user and tenant
        slog.InfoContext(c.Request.Context(), "tenant access",
            slog.Any("user_id", userID),
            slog.String("tenant_id", tenantID))

        // Add custom tenant validation logic here
        // e.g., check if user belongs to tenant in external system

        c.Next()
    }
}

// APIKeyValidationMiddleware validates custom API keys (besides internal API).
func APIKeyValidationMiddleware(validKeys []string) gin.HandlerFunc {
    keySet := make(map[string]bool)
    for _, k := range validKeys {
        keySet[k] = true
    }

    return func(c *gin.Context) {
        apiKey := c.GetHeader("X-Custom-API-Key")
        if apiKey != "" && !keySet[apiKey] {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid API key"})
            return
        }
        c.Next()
    }
}
```

### Registration (Middleware)

```go
func main() {
    engine := sdk.New(
        sdk.WithConfigFile("config/app.yaml"),
    )

    // Global middleware (all routes, after CORS, before auth)
    engine.UseMiddleware(extensions.RequestLoggerMiddleware())
    engine.UseMiddleware(extensions.CustomHeadersMiddleware(map[string]string{
        "X-Powered-By":    "pdf-forge",
        "X-Frame-Options": "DENY",
    }))

    // API middleware (after auth, user context available)
    engine.UseAPIMiddleware(extensions.RateLimitMiddleware(10, 20)) // 10 req/s, burst 20
    engine.UseAPIMiddleware(extensions.TenantValidationMiddleware())
    engine.UseAPIMiddleware(extensions.APIKeyValidationMiddleware([]string{
        os.Getenv("CUSTOM_API_KEY_1"),
        os.Getenv("CUSTOM_API_KEY_2"),
    }))

    if err := engine.Run(); err != nil {
        log.Fatal(err)
    }
}
```

### Middleware Execution Order

```plaintext
Request arrives
    │
    ├─ gin.Recovery()           (built-in: panic recovery)
    ├─ gin.Logger()             (built-in: request logging)
    ├─ corsMiddleware()         (built-in: CORS headers)
    ├─ [USER GLOBAL MIDDLEWARE] ← engine.UseMiddleware()
    │
    ├─ Route: /health, /swagger, etc.
    │
    └─ Route: /api/v1/*
        ├─ middleware.Operation()        (built-in: operation ID)
        ├─ middleware.JWTAuth()          (built-in: JWT validation)
        ├─ middleware.IdentityContext()  (built-in: load user from DB)
        ├─ middleware.SystemRoleContext()(built-in: load system role)
        ├─ [USER API MIDDLEWARE]         ← engine.UseAPIMiddleware()
        │
        └─ Controller handler
```
