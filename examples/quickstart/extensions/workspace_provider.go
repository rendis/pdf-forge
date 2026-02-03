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
func (p *ExampleWorkspaceProvider) GetInjectables(ctx context.Context, req *sdk.GetInjectablesRequest) (*sdk.GetInjectablesResult, error) {
	// Example: Return different injectables based on workspace
	// In real usage, you'd query an external system here

	// Only provide custom injectables for specific workspaces
	if req.WorkspaceCode == "" {
		return &sdk.GetInjectablesResult{}, nil
	}

	// Translate labels based on locale
	customerNameLabel := "Nombre del Cliente"
	customerNameDesc := "Nombre completo del cliente"
	orderTotalLabel := "Total del Pedido"
	orderTotalDesc := "Monto total del pedido"
	customGroupName := "Datos del Cliente"

	if req.Locale == "en" {
		customerNameLabel = "Customer Name"
		customerNameDesc = "Full name of the customer"
		orderTotalLabel = "Order Total"
		orderTotalDesc = "Total order amount"
		customGroupName = "Customer Data"
	}

	return &sdk.GetInjectablesResult{
		Injectables: []sdk.ProviderInjectable{
			{
				Code:        "customer_name",
				Label:       customerNameLabel,
				Description: customerNameDesc,
				DataType:    sdk.ValueTypeString,
				GroupKey:    "custom_data",
			},
			{
				Code:        "order_total",
				Label:       orderTotalLabel,
				Description: orderTotalDesc,
				DataType:    sdk.ValueTypeNumber,
				GroupKey:    "custom_data",
				Formats: []sdk.ProviderFormat{
					{Key: "#,##0.00", Label: "1,234.56"},
					{Key: "$#,##0.00", Label: "$1,234.56"},
				},
			},
		},
		Groups: []sdk.ProviderGroup{
			{
				Key:  "custom_data",
				Name: customGroupName,
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
