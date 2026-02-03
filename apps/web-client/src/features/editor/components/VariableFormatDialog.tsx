import { useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAvailableFormats, getDefaultFormat } from '../types/injectable'
import type { Variable } from '../types/variables'

export interface VariableFormatDialogProps {
  variable: Variable
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (format: string) => void
  onCancel: () => void
}

export function VariableFormatDialog({
  variable,
  open,
  onOpenChange,
  onSelect,
  onCancel,
}: VariableFormatDialogProps) {
  const formats = getAvailableFormats(variable.formatConfig)
  const defaultFormat = getDefaultFormat(variable.formatConfig)
  const [selectedFormat, setSelectedFormat] = useState(defaultFormat)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFormat(defaultFormat)
      setIsSubmitting(false)
    }
  }, [open, defaultFormat])

  const handleSelect = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedFormat || isSubmitting) return

      setIsSubmitting(true)
      try {
        onSelect(selectedFormat)
      } finally {
        setIsSubmitting(false)
        onOpenChange(false)
      }
    },
    [selectedFormat, isSubmitting, onSelect, onOpenChange]
  )

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          forceMount
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-[400px] translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="flex items-start justify-between border-b border-border p-6">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold">
                Seleccionar formato
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {variable.label}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSelect}>
            <div className="space-y-4 p-6">
              <div>
                <Label className="mb-2 block text-xs font-medium" htmlFor="format-select">
                  Formato
                </Label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger id="format-select" className="border-border">
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format} value={format} className="text-xs">
                        <span className="font-mono">{format}</span>
                        {format === defaultFormat && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (default)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border p-6">
              <button
                type="button"
                onClick={() => {
                  onCancel()
                  onOpenChange(false)
                }}
                disabled={isSubmitting}
                className="rounded-none border border-border bg-background px-6 py-2.5 text-xs transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedFormat || isSubmitting}
                className="rounded-none bg-foreground px-6 py-2.5 text-xs text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Seleccionando...' : 'Seleccionar'}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
