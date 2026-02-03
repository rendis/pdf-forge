package main

import (
	"log"

	"github.com/rendis/pdf-forge/sdk"
)

func main() {
	engine := sdk.New()

	if err := engine.Run(); err != nil {
		log.Fatal(err)
	}
}
