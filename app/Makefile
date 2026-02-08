.PHONY: install build dev lint preview clean help

install:
	pnpm install

build: install
	pnpm build

dev:
	pnpm dev

lint:
	pnpm lint

preview:
	pnpm preview

clean:
	rm -rf dist/ node_modules/

help:
	@echo "install  - Install dependencies"
	@echo "build    - Build production bundle"
	@echo "dev      - Start Vite dev server"
	@echo "lint     - Run ESLint"
	@echo "preview  - Preview production build"
	@echo "clean    - Remove dist/ and node_modules/"
