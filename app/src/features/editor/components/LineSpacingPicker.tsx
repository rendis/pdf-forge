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
import {
  DEFAULT_LINE_SPACING,
  LINE_SPACING_PRESETS,
  normalizeLineSpacingPreset,
  type LineSpacingPreset,
} from '../config'
import { useTranslation } from 'react-i18next'

interface LineSpacingPickerProps {
  editor: Editor
}

function getCurrentLineSpacing(editor: Editor): LineSpacingPreset {
  const paragraphSpacing = editor.getAttributes('paragraph')
    .lineSpacing as string | undefined
  const headingSpacing = editor.getAttributes('heading')
    .lineSpacing as string | undefined

  if (editor.isActive('heading')) {
    return normalizeLineSpacingPreset(headingSpacing)
  }

  return normalizeLineSpacingPreset(paragraphSpacing)
}

export function LineSpacingPicker({ editor }: LineSpacingPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const currentSpacing = getCurrentLineSpacing(editor)

  const applySpacing = (value: LineSpacingPreset) => {
    // Select all content if no text is selected, so spacing applies to entire document
    const { from, to } = editor.state.selection
    const hasSelection = from !== to

    if (!hasSelection) {
      editor.chain().focus().selectAll().run()
    }

    if (value === DEFAULT_LINE_SPACING) {
      editor.chain().focus().unsetLineSpacing().run()
    } else {
      editor.chain().focus().setLineSpacing(value).run()
    }

    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-[120px] shrink-0 justify-between px-2 text-xs font-normal"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="truncate">
            {t(LINE_SPACING_PRESETS[currentSpacing].labelKey)}
          </span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[160px] p-1"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {Object.entries(LINE_SPACING_PRESETS).map(([value, preset]) => (
          <button
            key={value}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applySpacing(value as LineSpacingPreset)}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
              'hover:bg-accent hover:text-accent-foreground',
              'outline-none',
              currentSpacing === value && 'bg-accent',
            )}
          >
            <Check
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                currentSpacing === value ? 'opacity-100' : 'opacity-0',
              )}
            />
            {t(preset.labelKey)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
