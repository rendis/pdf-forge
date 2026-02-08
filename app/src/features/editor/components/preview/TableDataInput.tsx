import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { TableColumnMeta } from '../../types/variables'
import type { TableInputRow, TableInputValue } from '../../types/table-input'
import { createEmptyRow } from '../../types/table-input'

interface TableDataInputProps {
  variableId: string
  label: string
  columns: TableColumnMeta[]
  value: TableInputValue | undefined
  onChange: (value: TableInputValue) => void
  disabled?: boolean
}

interface SortableRowProps {
  row: TableInputRow
  columns: TableColumnMeta[]
  lang: string
  onCellChange: (rowId: string, columnKey: string, value: string | number | boolean | null) => void
  onDelete: (rowId: string) => void
  disabled?: boolean
  isOnly: boolean
}

function SortableRow({
  row,
  columns,
  lang: _lang,
  onCellChange,
  onDelete,
  disabled,
  isOnly,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-b border-border last:border-b-0',
        isDragging && 'opacity-50 bg-muted'
      )}
    >
      {/* Drag handle */}
      <td className="w-8 px-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>

      {/* Cell inputs */}
      {columns.map((col) => (
        <td key={col.key} className="px-2 py-1.5">
          <CellInput
            column={col}
            value={row.cells[col.key]}
            onChange={(value) => onCellChange(row.id, col.key, value)}
            disabled={disabled}
          />
        </td>
      ))}

      {/* Delete button */}
      <td className="w-8 px-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(row.id)}
          disabled={disabled || isOnly}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          title={isOnly ? undefined : 'Delete row'}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  )
}

interface CellInputProps {
  column: TableColumnMeta
  value: string | number | boolean | null
  onChange: (value: string | number | boolean | null) => void
  disabled?: boolean
}

function CellInput({ column, value, onChange, disabled }: CellInputProps) {
  const handleChange = (newValue: string | number | boolean | null) => {
    onChange(newValue)
  }

  switch (column.dataType) {
    case 'BOOLEAN':
      return (
        <Checkbox
          checked={!!value}
          onCheckedChange={(checked) => handleChange(!!checked)}
          disabled={disabled}
        />
      )
    case 'NUMBER':
    case 'CURRENCY':
      return (
        <Input
          type="number"
          value={value === null ? '' : String(value)}
          onChange={(e) =>
            handleChange(e.target.value === '' ? null : parseFloat(e.target.value))
          }
          disabled={disabled}
          className="h-8 text-xs"
          step="any"
        />
      )
    case 'DATE':
      return (
        <Input
          type="date"
          value={value === null ? '' : String(value)}
          onChange={(e) => handleChange(e.target.value || null)}
          disabled={disabled}
          className="h-8 text-xs [color-scheme:light] dark:[color-scheme:dark]"
        />
      )
    default:
      return (
        <Input
          type="text"
          value={value === null ? '' : String(value)}
          onChange={(e) => handleChange(e.target.value || null)}
          disabled={disabled}
          className="h-8 text-xs"
        />
      )
  }
}

export function TableDataInput({
  variableId: _variableId,
  label,
  columns,
  value,
  onChange,
  disabled = false,
}: TableDataInputProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  // Initialize with one empty row if no value
  const tableValue: TableInputValue = useMemo(
    () => value ?? { columns, rows: [createEmptyRow(columns)] },
    [value, columns]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = tableValue.rows.findIndex((r) => r.id === active.id)
        const newIndex = tableValue.rows.findIndex((r) => r.id === over.id)

        onChange({
          ...tableValue,
          rows: arrayMove(tableValue.rows, oldIndex, newIndex),
        })
      }
    },
    [tableValue, onChange]
  )

  const handleCellChange = useCallback(
    (rowId: string, columnKey: string, cellValue: string | number | boolean | null) => {
      onChange({
        ...tableValue,
        rows: tableValue.rows.map((row) =>
          row.id === rowId
            ? { ...row, cells: { ...row.cells, [columnKey]: cellValue } }
            : row
        ),
      })
    },
    [tableValue, onChange]
  )

  const handleAddRow = useCallback(() => {
    onChange({
      ...tableValue,
      rows: [...tableValue.rows, createEmptyRow(columns)],
    })
  }, [tableValue, columns, onChange])

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (tableValue.rows.length <= 1) return
      onChange({
        ...tableValue,
        rows: tableValue.rows.filter((r) => r.id !== rowId),
      })
    },
    [tableValue, onChange]
  )

  const getColumnLabel = (col: TableColumnMeta): string => {
    if (col.labels[lang]) return col.labels[lang]
    if (col.labels['en']) return col.labels['en']
    const firstLabel = Object.values(col.labels)[0]
    return firstLabel ?? col.key
  }

  return (
    <div className={cn('space-y-2', disabled && 'opacity-50')}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          disabled={disabled}
          className="h-7 font-mono text-[10px] uppercase tracking-wider"
        >
          <Plus className="h-3 w-3 mr-1" />
          {t('editor.preview.addRow')}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="w-8" />
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {getColumnLabel(col)}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={tableValue.rows.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {tableValue.rows.map((row) => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    lang={lang}
                    onCellChange={handleCellChange}
                    onDelete={handleDeleteRow}
                    disabled={disabled}
                    isOnly={tableValue.rows.length <= 1}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>

          {tableValue.rows.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {t('editor.preview.emptyTable')}
            </div>
          )}
        </div>
      </DndContext>
    </div>
  )
}
