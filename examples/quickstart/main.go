package main

import (
	"log"

	"github.com/rendis/pdf-forge/sdk"
	"quickstart/extensions"
	"quickstart/extensions/injectors"
)

func main() {
	engine := sdk.New(
		sdk.WithConfigFile("config/app.yaml"),
		sdk.WithI18nFile("config/injectors.i18n.yaml"),
	)

	// Register one example injector per ValueType
	engine.RegisterInjector(&injectors.ExampleStringInjector{}) // STRING
	engine.RegisterInjector(&injectors.ExampleNumberInjector{}) // NUMBER
	engine.RegisterInjector(&injectors.ExampleBoolInjector{})   // BOOL
	engine.RegisterInjector(&injectors.ExampleTimeInjector{})   // TIME
	engine.RegisterInjector(&injectors.ExampleImageInjector{})  // IMAGE
	engine.RegisterInjector(&injectors.ExampleTableInjector{})  // TABLE
	engine.RegisterInjector(&injectors.ExampleListInjector{})   // LIST

	// Register mapper (handles request parsing for render)
	engine.RegisterMapper(&extensions.ExampleMapper{})

	// Register init function (loads shared data before injectors)
	engine.SetInitFunc(extensions.ExampleInit())

	// Auto-apply pending database migrations (idempotent)
	if err := engine.RunMigrations(); err != nil {
		log.Fatal("migrations: ", err)
	}

	if err := engine.Run(); err != nil {
		log.Fatal(err)
	}
}
