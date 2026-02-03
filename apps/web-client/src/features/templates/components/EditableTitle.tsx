import { useState, useEffect, useRef } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableTitleProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function EditableTitle({
  value,
  onSave,
  isLoading = false,
  className,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes
  useEffect(() => {
    if (!isEditing && !isSaving) {
      setEditValue(value)
    }
  }, [value, isEditing, isSaving])

  // Focus and select on edit
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const trimmed = editValue.trim()

    // Don't save if empty or unchanged
    if (!trimmed || trimmed === value) {
      setEditValue(value)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setIsEditing(false)

    try {
      await onSave(trimmed)
    } catch {
      // Revert on error
      setEditValue(value)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  const handleClick = () => {
    if (!isLoading && !isSaving) {
      setIsEditing(true)
    }
  }

  const showLoading = isLoading || isSaving

  if (isEditing) {
    return (
      <div className="relative flex items-center gap-3">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={showLoading}
          className={cn(
            'w-full bg-transparent border-b-2 border-primary outline-none',
            'disabled:opacity-50',
            className
          )}
        />
        {showLoading && (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex w-full cursor-text items-center rounded px-2 py-1 -mx-2 -my-1',
        'transition-all duration-150',
        'hover:bg-muted/40',
        showLoading && 'pointer-events-none'
      )}
    >
      <span className={cn('min-w-0 flex-1 truncate', className)}>{value}</span>
      {showLoading ? (
        <Loader2 className="ml-3 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Pencil
          size={18}
          className="ml-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60"
        />
      )}
    </div>
  )
}
