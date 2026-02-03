import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, GripVertical, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ListInputItem, ListInputValue } from '../../types/list-input'

interface ListDataInputProps {
  variableId: string
  label: string
  value?: ListInputValue
  onChange: (value: ListInputValue) => void
  disabled?: boolean
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function createEmptyItem(): ListInputItem {
  return { id: generateId(), value: '' }
}

export function ListDataInput({
  variableId,
  label,
  value,
  onChange,
  disabled = false,
}: ListDataInputProps) {
  const { t } = useTranslation()

  const items = useMemo(() => {
    return value?.items && value.items.length > 0
      ? value.items
      : [createEmptyItem()]
  }, [value?.items])

  const updateItems = useCallback(
    (newItems: ListInputItem[]) => {
      onChange({ items: newItems })
    },
    [onChange]
  )

  const handleItemChange = useCallback(
    (index: number, newValue: string) => {
      const newItems = [...items]
      newItems[index] = { ...newItems[index], value: newValue }
      updateItems(newItems)
    },
    [items, updateItems]
  )

  const handleAddItem = useCallback(() => {
    updateItems([...items, createEmptyItem()])
  }, [items, updateItems])

  const handleRemoveItem = useCallback(
    (index: number) => {
      if (items.length <= 1) return
      const newItems = items.filter((_, i) => i !== index)
      updateItems(newItems)
    },
    [items, updateItems]
  )

  const handleAddChild = useCallback(
    (parentIndex: number) => {
      const newItems = [...items]
      const parent = { ...newItems[parentIndex] }
      parent.children = [...(parent.children || []), createEmptyItem()]
      newItems[parentIndex] = parent
      updateItems(newItems)
    },
    [items, updateItems]
  )

  const handleChildChange = useCallback(
    (parentIndex: number, childIndex: number, newValue: string) => {
      const newItems = [...items]
      const parent = { ...newItems[parentIndex] }
      const children = [...(parent.children || [])]
      children[childIndex] = { ...children[childIndex], value: newValue }
      parent.children = children
      newItems[parentIndex] = parent
      updateItems(newItems)
    },
    [items, updateItems]
  )

  const handleRemoveChild = useCallback(
    (parentIndex: number, childIndex: number) => {
      const newItems = [...items]
      const parent = { ...newItems[parentIndex] }
      const children = (parent.children || []).filter((_, i) => i !== childIndex)
      parent.children = children.length > 0 ? children : undefined
      newItems[parentIndex] = parent
      updateItems(newItems)
    },
    [items, updateItems]
  )

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} <span className="font-mono text-[10px]">({variableId})</span>
      </Label>

      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={item.id}>
            {/* Main item row */}
            <div className="flex items-center gap-1.5">
              <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              <Input
                value={item.value}
                onChange={(e) => handleItemChange(index, e.target.value)}
                placeholder={t('editor.preview.listItemPlaceholder', 'Item text...')}
                className="h-8 text-xs"
                disabled={disabled}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => handleAddChild(index)}
                disabled={disabled}
                title={t('editor.preview.addSubItem', 'Add sub-item')}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 text-destructive/70 hover:text-destructive"
                onClick={() => handleRemoveItem(index)}
                disabled={disabled || items.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Children */}
            {item.children && item.children.length > 0 && (
              <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-2">
                {item.children.map((child, childIndex) => (
                  <div key={child.id} className="flex items-center gap-1.5">
                    <GripVertical className="h-3 w-3 flex-shrink-0 text-muted-foreground/30" />
                    <Input
                      value={child.value}
                      onChange={(e) => handleChildChange(index, childIndex, e.target.value)}
                      placeholder={t('editor.preview.subItemPlaceholder', 'Sub-item text...')}
                      className="h-7 text-xs"
                      disabled={disabled}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 text-destructive/70 hover:text-destructive"
                      onClick={() => handleRemoveChild(index, childIndex)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={handleAddItem}
        disabled={disabled}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        {t('editor.preview.addListItem', 'Add Item')}
      </Button>
    </div>
  )
}
