// Package sdk is the public API surface of pdf-forge.
//
// Extension authors and fork consumers should import only this package.
// All types, interfaces, and constructors needed to build custom injectors,
// mappers, providers, and authenticators are re-exported here as type aliases.
//
// Example usage:
//
//	import "github.com/rendis/pdf-forge/core/sdk"
//
//	engine := sdk.New()
//	engine.RegisterInjector(&MyInjector{})
//	engine.Run()
package sdk
