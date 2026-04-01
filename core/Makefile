.PHONY: build run migrate dev test test-integration lint fmt swagger clean help

# Go commands use -C .. because go.mod is at project root
build:
	go build -C .. -o core/bin/server ./core/cmd/api

run:
	go run -C .. ./core/cmd/api

migrate:
	go run -C .. ./core/cmd/api migrate

dev:
	air

test:
	go test -C .. ./core/...

test-integration:
	go test -C .. -tags=integration ./core/internal/migrations ./core/cmd/api/bootstrap

lint:
	golangci-lint run

fmt:
	gofmt -w .

swagger:
	swag init -d .. -g core/cmd/api/main.go -o docs --parseDependency --parseInternal
	npx swagger2openapi docs/swagger.yaml -o docs/openapi.yaml --yaml

clean:
	rm -rf bin/

help:
	@echo "build    - Build Go backend binary"
	@echo "run      - Run API server"
	@echo "migrate  - Apply database migrations"
	@echo "dev      - Hot reload with air"
	@echo "test     - Run Go tests"
	@echo "lint     - Run golangci-lint"
	@echo "fmt      - Format Go code"
	@echo "swagger  - Regenerate Swagger + OpenAPI specs"
	@echo "clean    - Remove build artifacts"
