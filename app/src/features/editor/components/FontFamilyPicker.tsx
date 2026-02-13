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
import { TOOLBAR_FONT_FAMILIES } from '../config'

interface FontFamilyPickerProps {
  editor: Editor
}

export function FontFamilyPicker({ editor }: FontFamilyPickerProps) {
  const [open, setOpen] = useState(false)
  const currentFamily =
    editor.getAttributes('textStyle').fontFamily || 'Inter'

  const currentLabel =
    TOOLBAR_FONT_FAMILIES.find((f) => f.value === currentFamily)?.label ??
    currentFamily.split(',')[0]

  const applyFont = (value: string) => {
    editor.chain().focus().setFontFamily(value).run()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-[150px] shrink-0 justify-between px-2 text-xs font-normal"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[180px] p-1"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {TOOLBAR_FONT_FAMILIES.map((font) => (
          <button
            key={font.value}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFont(font.value)}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer',
              'hover:bg-accent hover:text-accent-foreground',
              'outline-none',
              currentFamily === font.value && 'bg-accent',
            )}
            style={{ fontFamily: font.value }}
          >
            <Check
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                currentFamily === font.value ? 'opacity-100' : 'opacity-0',
              )}
            />
            {font.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
