.PHONY: build run migrate dev test lint fmt swagger clean help

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

lint:
	golangci-lint run

fmt:
	gofmt -w .

swagger:
	swag init -d .. -g core/cmd/api/main.go -o docs --parseDependency

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
	@echo "swagger  - Regenerate OpenAPI spec"
	@echo "clean    - Remove build artifacts"
