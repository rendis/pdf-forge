# Scripts Reference

> Available in projects generated with `pdfforge-cli init`.

## Overview

pdf-forge projects include a scripts system for custom tasks. Scripts are self-contained directories with a Makefile.

## Commands

| Command                          | Description                          |
| -------------------------------- | ------------------------------------ |
| `pdfforge-cli run-script`        | Interactive selector (↑↓, q to quit) |
| `pdfforge-cli run-script <name>` | Run script directly                  |
| `make run-script`                | Same as CLI (invokes pdfforge-cli)   |
| `make run-script <name>`         | Run script directly via make         |

## Interactive Selector

Run without arguments for interactive mode:

```bash
pdfforge-cli run-script
# or
make run-script
```

- Use **↑↓** to navigate
- Press **Enter** to select
- Press **q**, **Esc**, or **Ctrl+C** to quit
- "Quit" option always at the end

## Creating Scripts

### Directory Structure

```plaintext
scripts/
  <script-name>/
    Makefile         # REQUIRED: must have `run` target
    main.py          # or any language
```

### Required Makefile

Every script MUST have a Makefile with a `run` target:

```makefile
.PHONY: run

run:
    # your command here
```

## Language Templates

### Python

```makefile
.PHONY: run

run:
    python main.py $(ARGS)
```

### Go

```makefile
.PHONY: run

run:
    go run . $(ARGS)
```

### TypeScript (Bun)

```makefile
.PHONY: run

run:
    bun run index.ts $(ARGS)
```

### TypeScript (Node)

```makefile
.PHONY: run

run:
    npx tsx index.ts $(ARGS)
```

### Shell

```makefile
.PHONY: run

run:
    ./script.sh $(ARGS)
```

## Passing Arguments

Use `ARGS` env var:

```bash
make run-script my-script ARGS="--input=data.json --verbose"
```

Access in script:

```python
# Python
import sys
print(sys.argv)  # ['main.py', '--input=data.json', '--verbose']
```

```go
// Go
fmt.Println(os.Args)
```

## Best Practices

1. **Self-contained**: Include all deps or document requirements
2. **Idempotent**: Safe to run multiple times
3. **Documented**: Add README.md in script dir if complex
4. **Error handling**: Exit with non-zero on failure

## Example

```plaintext
scripts/
  migrate-data/
    Makefile
    main.go
```

**Makefile:**

```makefile
.PHONY: run

run:
    go run . $(ARGS)
```

**Usage:**

```bash
pdfforge-cli run-script migrate-data
# or with args
make run-script migrate-data ARGS="--dry-run"
```
