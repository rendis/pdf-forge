import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { TOOLBAR_FONT_SIZES } from '../config'

interface FontSizePickerProps {
  editor: Editor
}

export function FontSizePicker({ editor }: FontSizePickerProps) {
  const [open, setOpen] = useState(false)
  const currentSize =
    editor.getAttributes('textStyle').fontSize?.replace('px', '') || '14'

  const applySize = (value: number) => {
    editor.chain().focus().setFontSize(`${value}px`).run()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-[55px] shrink-0 justify-between px-2 text-xs font-normal"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span>{currentSize}</span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[70px] p-1"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {TOOLBAR_FONT_SIZES.map((s) => (
          <button
            key={s.value}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applySize(s.value)}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer',
              'hover:bg-accent hover:text-accent-foreground',
              'outline-none',
              currentSize === String(s.value) && 'bg-accent',
            )}
          >
            <Check
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                currentSize === String(s.value) ? 'opacity-100' : 'opacity-0',
              )}
            />
            {s.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
