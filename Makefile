.PHONY: build-frontend build run test lint fmt swagger dev clean help

# Frontend
# VITE_BASE_PATH: Set to deploy path (e.g., /pdf-forge/). Defaults to /
build-frontend:
	cd apps/web-client && pnpm install && \
	VITE_API_URL=/api/v1 VITE_BASE_PATH=$${VITE_BASE_PATH:-/} pnpm build
	rm -rf internal/frontend/dist
	cp -r apps/web-client/dist internal/frontend/

# Go
build: build-frontend
	go build ./...

run:
	go run ./cmd/api

test:
	go test ./...

lint:
	golangci-lint run

fmt:
	gofmt -w .

swagger:
	swag init -g cmd/api/main.go -o docs

dev:
	air

clean:
	rm -rf internal/frontend/dist apps/web-client/dist

help:
	@echo "build-frontend - Build React SPA and copy to embed dir"
	@echo "build          - Build frontend + Go binary"
	@echo "run            - Run API server"
	@echo "test           - Run Go tests"
	@echo "lint           - Run golangci-lint"
	@echo "fmt            - Format Go code"
	@echo "swagger        - Regenerate OpenAPI spec"
	@echo "dev            - Hot reload with air"
	@echo "clean          - Remove build artifacts"
