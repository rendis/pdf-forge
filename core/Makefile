.PHONY: build run migrate dev test lint fmt swagger clean help

build:
	go build -o bin/server ./cmd/api

run:
	go run ./cmd/api

migrate:
	go run ./cmd/api migrate

dev:
	air

test:
	go test ./...

lint:
	golangci-lint run

fmt:
	gofmt -w .

swagger:
	swag init -g cmd/api/main.go -o docs

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
