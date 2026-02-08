import type { TableColumnMeta } from './variables'

/**
 * Represents a single row in the table input UI.
 * The id is used as React key and for drag-and-drop reordering.
 */
export interface TableInputRow {
  id: string
  cells: Record<string, string | number | boolean | null>
}

/**
 * Complete table data structure for TABLE type injectables.
 * This is the format sent to the backend for preview generation.
 */
export interface TableInputValue {
  columns: TableColumnMeta[]
  rows: TableInputRow[]
}

/**
 * Cell value format expected by backend.
 * Maps to entity.InjectableValue in Go.
 */
export interface TableCellValue {
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE'
  strVal?: string
  numVal?: number
  boolVal?: boolean
  timeVal?: string // ISO format
}

/**
 * Row format expected by backend.
 * Maps to entity.TableRow in Go.
 */
export interface TableRowPayload {
  cells: Array<{ value: TableCellValue | null }>
}

/**
 * Full table payload format sent to backend.
 * Maps to entity.TableValue in Go.
 */
export interface TableValuePayload {
  columns: TableColumnMeta[]
  rows: TableRowPayload[]
}

/**
 * Converts frontend TableInputValue to backend-compatible TableValuePayload.
 */
export function toTableValuePayload(
  input: TableInputValue
): TableValuePayload {
  return {
    columns: input.columns,
    rows: input.rows.map((row) => ({
      cells: input.columns.map((col) => {
        const cellValue = row.cells[col.key]

        if (cellValue === null || cellValue === undefined || cellValue === '') {
          return { value: null }
        }

        switch (col.dataType) {
          case 'NUMBER':
          case 'CURRENCY':
            return {
              value: {
                type: 'NUMBER' as const,
                numVal: typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue)),
              },
            }
          case 'BOOLEAN':
            return {
              value: {
                type: 'BOOLEAN' as const,
                boolVal: Boolean(cellValue),
              },
            }
          case 'DATE':
            return {
              value: {
                type: 'DATE' as const,
                timeVal: String(cellValue),
              },
            }
          default:
            return {
              value: {
                type: 'STRING' as const,
                strVal: String(cellValue),
              },
            }
        }
      }),
    })),
  }
}

/**
 * Creates an empty row with null values for all columns.
 */
export function createEmptyRow(columns: TableColumnMeta[]): TableInputRow {
  const cells: Record<string, string | number | boolean | null> = {}
  columns.forEach((col) => {
    cells[col.key] = null
  })
  return {
    id: crypto.randomUUID(),
    cells,
  }
}
