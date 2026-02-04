# pdfforge-cli

CLI tool for pdf-forge project scaffolding and management.

## Installation

```bash
go install github.com/rendis/pdf-forge/cmd/pdfforge-cli@latest
```

## Command Center (Interactive)

Run without arguments for interactive menu:

```bash
pdfforge-cli
```

Options:

- **Install/Update Project** - detect existing projects, handle conflicts
- **Check System (doctor)** - verify Typst, DB, auth
- **Run Migrations** - apply pending migrations
- **Exit**

## Commands

| Command                       | Description                   |
| ----------------------------- | ----------------------------- |
| `pdfforge-cli`                | Interactive command center    |
| `pdfforge-cli init <name>`    | Scaffold new project          |
| `pdfforge-cli migrate`        | Apply database migrations     |
| `pdfforge-cli doctor`         | Check Typst, DB, schema, auth |
| `pdfforge-cli version`        | Print version info            |
| `pdfforge-cli update`         | Self-update CLI               |
| `pdfforge-cli update --check` | Check for updates only        |

## `init` Command

Scaffolds a new pdf-forge project.

### Flags

| Flag           | Default  | Description               |
| -------------- | -------- | ------------------------- |
| `-m, --module` | `<name>` | Go module name            |
| `--examples`   | `true`   | Include example injectors |
| `--docker`     | `true`   | Include Docker setup      |
| `--git`        | `false`  | Initialize git repository |
| `-y, --yes`    | —        | Non-interactive mode      |

### Examples

```bash
# Interactive project creation
pdfforge-cli init myproject

# Non-interactive with custom module
pdfforge-cli init myproject -m github.com/company/myproject -y

# Without Docker files
pdfforge-cli init myproject --docker=false
```

## `doctor` Command

Runs health checks on the system.

### Checks Performed

1. **Typst CLI** - Verifies `typst --version` works
2. **PostgreSQL** - Tests database connection
3. **DB Schema** - Checks `tenancy.tenants` table exists
4. **Auth** - Verifies JWKS URL configured (warns if dummy mode)
5. **OS Info** - Displays platform and architecture

### Example Output

```textplain
pdfforge-cli doctor

Checking system health...
[✓] Typst CLI: v0.12.0
[✓] PostgreSQL: Connected (16.1)
[✓] DB Schema: Valid
[!] Auth: Dummy mode (no JWKS configured)
[i] OS: darwin/arm64
```

## Project Update Flow

When running Command Center → "Install/Update Project":

### Detection

Scans for `.pdfforge.lock` file to determine project status:

| Status   | Meaning                       | Options                              |
| -------- | ----------------------------- | ------------------------------------ |
| NEW      | No project found              | Create here / Create in subdirectory |
| EXISTING | Project up-to-date            | Reinstall/Reset                      |
| OUTDATED | Version mismatch in lock file | Update / Skip                        |

### Conflict Resolution

When updating a project with modified files:

1. **Skip modified files** - Keep your changes, skip updates for those files
2. **Show diff and decide** - Review each conflict interactively
3. **Backup and overwrite** - Save originals to `.pdfforge-backup/`, then overwrite
4. **Overwrite all** - Replace all files without backup

Backups are stored in `.pdfforge-backup/` with timestamp subdirectories.

## Environment Variables

The CLI uses the same configuration as the main application:

- `DOC_ENGINE_*` prefix for all config vars
- Config file: `settings/app.yaml` (or `--config` flag)

See [docs/configuration.md](../../docs/configuration.md) for full reference.
