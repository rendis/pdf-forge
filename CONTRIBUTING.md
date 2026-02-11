# Contributing to pdf-forge

Thank you for your interest in contributing to pdf-forge! This document provides guidelines for contributing to the upstream project.

> **Note:** If you want to **fork and customize** pdf-forge for your own use, see [FORKING.md](FORKING.md) instead. This guide is for contributing improvements back to the main project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Code Style Guide](#code-style-guide)
- [Community](#community)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers through GitHub Issues.

## Ways to Contribute

There are many ways to contribute to pdf-forge:

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Propose new capabilities or improvements
- 📖 **Improve documentation** - Fix typos, clarify explanations, add examples
- 💻 **Submit code** - Bug fixes, features, optimizations
- 👀 **Review pull requests** - Provide feedback on proposed changes
- 💬 **Help others** - Answer questions in Issues and Discussions

## Development Setup

### Prerequisites

- **Go 1.25+** - [install](https://go.dev/dl/)
- **PostgreSQL 16+** - [install](https://www.postgresql.org/download/)
- **pnpm** - `npm install -g pnpm`
- **Typst CLI** - [install](https://github.com/typst/typst/releases)
- **Docker** (optional) - [install](https://docs.docker.com/get-docker/)
- **Make** - Usually pre-installed on macOS/Linux

### Setup Steps

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/pdf-forge.git
   cd pdf-forge
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/rendis/pdf-forge.git
   ```

4. **Install dependencies**:
   ```bash
   # Backend dependencies (Go modules)
   go mod download

   # Frontend dependencies
   pnpm --dir app install
   ```

5. **Configure environment**:
   ```bash
   # Copy example config
   cp .env.example .env

   # Edit .env with your database credentials
   # DB_HOST=localhost
   # DB_PORT=5432
   # DB_USER=postgres
   # DB_PASSWORD=your_password
   # DB_NAME=pdfforge_dev
   ```

6. **Start PostgreSQL** (if not using Docker):
   ```bash
   # Create database
   createdb pdfforge_dev
   ```

7. **Run migrations**:
   ```bash
   make migrate
   ```

8. **Start development servers**:
   ```bash
   # Option 1: Both frontend + backend
   make dev

   # Option 2: Backend only
   make -C core dev

   # Option 3: Frontend only
   make -C app dev
   ```

9. **Verify setup**:
   - Frontend: http://localhost:3000
   - API: http://localhost:8080
   - Swagger: http://localhost:8080/swagger/index.html

### Using Docker

Alternatively, use Docker Compose:

```bash
# Start all services
docker compose up --build

# Frontend: http://localhost:3000
# API: http://localhost:8080
```

## Making Changes

### Contribution Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**:
   - **Core engine changes**: Modify `core/internal/` (NOT `core/extensions/`)
   - **Frontend changes**: Modify `app/src/`
   - **Documentation**: Modify relevant `.md` files

3. **Write tests**:
   ```bash
   # Add tests for Go code
   # File: core/internal/path/to/feature_test.go

   # Run tests
   make test
   ```

4. **Run linters**:
   ```bash
   # Go linter
   make lint

   # Frontend linter
   make -C app lint
   ```

5. **Build and verify**:
   ```bash
   make build
   ```

6. **Update API docs** (if API changed):
   ```bash
   make swagger
   ```

### Important: What to Change

| ✅ **DO** change | ❌ **DO NOT** change |
|---|---|
| `core/internal/` - Core engine | `core/extensions/` - User customization zone |
| `app/src/` - Frontend | `go.mod` - Module path must stay `github.com/rendis/pdf-forge` |
| `core/docs/` - Documentation | |
| Tests (`*_test.go`) | |

## Pull Request Process

### Before Submitting

Ensure your PR meets these requirements:

- [ ] **Tests pass**: `make test`
- [ ] **Linter clean**: `make lint`
- [ ] **Build succeeds**: `make build`
- [ ] **Swagger updated** (if API changed): `make swagger`
- [ ] **Documentation updated**: Update README.md, docs, etc. if needed
- [ ] **Conventional commits**: Follow commit message format (see below)

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

⚡
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring (no functional changes)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(editor): add table merge cells support

Implemented cell merging for tables in the TipTap editor.
Includes UI controls and backend validation.

⚡
```

```
fix(render): handle empty image URLs gracefully

Previously crashed when image URL was empty string.
Now logs warning and skips image rendering.

⚡
```

### Submitting the PR

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub against `rendis/pdf-forge:main`

3. **Fill out the PR template** with:
   - Description of changes
   - Related issue numbers (if any)
   - Testing done
   - Screenshots (if UI changes)

4. **Request review** from maintainers

5. **Address feedback**:
   - Make requested changes
   - Push additional commits
   - Re-request review

### Merge Requirements

PRs are merged when:
- ✅ All CI checks pass (CodeQL, linters, tests)
- ✅ At least 1 maintainer approval
- ✅ No merge conflicts
- ✅ Documentation updated
- ✅ CHANGELOG.md updated (for significant changes)

## Reporting Bugs

Found a bug? Please [open an issue](https://github.com/rendis/pdf-forge/issues/new?template=bug_report.md) with:

- **Clear title**: Concise description of the issue
- **Description**: What happened vs. what you expected
- **Steps to reproduce**: Minimal steps to trigger the bug
- **Environment**:
  - OS and version
  - Go version (`go version`)
  - PostgreSQL version
  - Browser (if frontend issue)
- **Logs/screenshots**: Error messages or visual proof

**Before submitting**, search existing issues to avoid duplicates.

## Suggesting Features

Have an idea for improvement? We'd love to hear it!

1. **Check existing issues/discussions** to avoid duplicates
2. **Open a [Feature Request](https://github.com/rendis/pdf-forge/issues/new?template=feature_request.md)** with:
   - **Problem description**: What problem does this solve?
   - **Proposed solution**: How should it work?
   - **Alternatives considered**: Other approaches you thought of
   - **Additional context**: Use cases, mockups, examples

**Note:** Features that conflict with the fork-based architecture or add significant complexity may be rejected.

## Code Style Guide

### Go Code

We enforce code quality with `golangci-lint` (see [.golangci.yml](.golangci.yml)):

#### Critical Rules

- ✅ **Always use `slog.InfoContext(ctx, ...)`** - NEVER `slog.Info()`
- ✅ **Never use `log` package** - Use `log/slog` only (enforced by `depguard`)
- ✅ **Function length**: Max 60 lines / 40 statements (`funlen`)
- ✅ **Cognitive complexity**: Max 15 (`gocognit`)
- ✅ **Cyclomatic complexity**: Max 15 (`gocyclo`)
- ✅ **Nesting depth**: Max 4 levels (`nestif`)
- ✅ **Security**: No security issues (`gosec`)

#### Formatting

```bash
# Format code
gofmt -w .

# Or use make
make -C core fmt
```

### Frontend Code

- **ESLint**: Enforced via `pnpm lint`
- **Prettier**: Auto-formatting on save
- **TypeScript**: Strict mode enabled
- **React 19**: Use modern patterns (hooks, function components)

### Documentation

- **Markdown**: Use GitHub-flavored Markdown
- **Code blocks**: Always specify language for syntax highlighting
- **Links**: Use relative links for internal docs

## Community

- **GitHub Issues**: [Report bugs, request features](https://github.com/rendis/pdf-forge/issues)
- **GitHub Discussions**: [Ask questions, share ideas](https://github.com/rendis/pdf-forge/discussions)
- **Pull Requests**: [Contribute code](https://github.com/rendis/pdf-forge/pulls)

---

**Thank you for contributing to pdf-forge!** 🎉

Every contribution, no matter how small, helps make this project better for everyone.
