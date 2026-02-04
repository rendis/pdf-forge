package extensions

import (
	"context"
	"fmt"

	"github.com/rendis/pdf-forge/sdk"
)

// ExampleWorkspaceProvider demonstrates a WorkspaceInjectableProvider implementation.
// In real usage, this would fetch injectables from an external system (API, database, etc.)
// based on the tenant and workspace.
type ExampleWorkspaceProvider struct{}

// GetInjectables returns available injectables for a workspace.
// This is called when the editor opens to populate the injectable list.
// Return all locales - the framework picks the right one based on request locale.
func (p *ExampleWorkspaceProvider) GetInjectables(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.GetInjectablesResult, error) {
	// Example: Return different injectables based on workspace
	// In real usage, you'd query an external system here

	// Only provide custom injectables for specific workspaces
	if injCtx.WorkspaceCode() == "" {
		return &sdk.GetInjectablesResult{}, nil
	}

	return &sdk.GetInjectablesResult{
		Injectables: []sdk.ProviderInjectable{
			{
				Code: "customer_name",
				Label: map[string]string{
					"es": "Nombre del Cliente",
					"en": "Customer Name",
				},
				Description: map[string]string{
					"es": "Nombre completo del cliente",
					"en": "Full name of the customer",
				},
				DataType: sdk.InjectableDataTypeText,
				GroupKey: "custom_data",
			},
			{
				Code: "order_total",
				Label: map[string]string{
					"es": "Total del Pedido",
					"en": "Order Total",
				},
				Description: map[string]string{
					"es": "Monto total del pedido",
					"en": "Total order amount",
				},
				DataType: sdk.InjectableDataTypeNumber,
				GroupKey: "custom_data",
				Formats: []sdk.ProviderFormat{
					{Key: "#,##0.00", Label: map[string]string{"es": "1.234,56", "en": "1,234.56"}},
					{Key: "$#,##0.00", Label: map[string]string{"es": "$1.234,56", "en": "$1,234.56"}},
				},
			},
		},
		Groups: []sdk.ProviderGroup{
			{
				Key: "custom_data",
				Name: map[string]string{
					"es": "Datos del Cliente",
					"en": "Customer Data",
				},
				Icon: "user",
			},
		},
	}, nil
}

// ResolveInjectables resolves a batch of injectable codes.
// This is called during render for workspace-specific injectables.
func (p *ExampleWorkspaceProvider) ResolveInjectables(ctx context.Context, req *sdk.ResolveInjectablesRequest) (*sdk.ResolveInjectablesResult, error) {
	values := make(map[string]*sdk.InjectableValue)
	errors := make(map[string]string)

	for _, code := range req.Codes {
		switch code {
		case "customer_name":
			// In real usage, fetch from external system using req.Payload or req.Headers
			val := sdk.StringValue("John Doe")
			values[code] = &val

		case "order_total":
			// Example: get from payload if available
			val := sdk.NumberValue(1234.56)
			values[code] = &val

		default:
			// Unknown code - non-critical error
			errors[code] = fmt.Sprintf("unknown injectable code: %s", code)
		}
	}

	return &sdk.ResolveInjectablesResult{
		Values: values,
		Errors: errors,
	}, nil
}
