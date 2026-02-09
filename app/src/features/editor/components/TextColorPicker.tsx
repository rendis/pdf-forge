import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Editor } from '@tiptap/react'
import { Baseline, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PRESET_COLORS } from '../config'

interface TextColorPickerProps {
  editor: Editor
}

export function TextColorPicker({ editor }: TextColorPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const currentColor = editor.getAttributes('textStyle').color as string | undefined

  const applyColor = (color: string) => {
    editor.chain().focus().setColor(color).run()
    setOpen(false)
  }

  const removeColor = () => {
    editor.chain().focus().unsetColor().run()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Baseline className="h-4 w-4" />
              <div
                className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-3.5 rounded-sm"
                style={{ backgroundColor: currentColor || 'currentColor' }}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {t('editor.toolbar.textColor')}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-auto p-3"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          {/* Color swatches */}
          <div className="grid grid-cols-8 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyColor(color)}
                className="h-6 w-6 rounded-sm border border-border hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              >
                {currentColor === color && (
                  <span className="flex items-center justify-center h-full">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: isLightColor(color) ? '#000' : '#fff',
                      }}
                    />
                  </span>
                )}
              </button>
            ))}
          </div>

          <Separator />

          {/* Custom color row */}
          <div className="flex items-center gap-2">
            <label className="relative h-7 w-7 shrink-0 rounded-sm border border-border cursor-pointer overflow-hidden">
              <div
                className="absolute inset-0"
                style={{ backgroundColor: currentColor || '#000000' }}
              />
              <input
                type="color"
                value={currentColor || '#000000'}
                onChange={(e) => {
                  editor.chain().focus().setColor(e.target.value).run()
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            <input
              type="text"
              value={currentColor || ''}
              onChange={(e) => {
                const val = e.target.value
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  editor.chain().focus().setColor(val).run()
                }
              }}
              placeholder="#000000"
              className="h-7 w-[80px] px-2 text-xs font-mono border border-border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {currentColor && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={removeColor}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                <X className="h-3 w-3 mr-1" />
                {t('editor.toolbar.removeTextColor')}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}
