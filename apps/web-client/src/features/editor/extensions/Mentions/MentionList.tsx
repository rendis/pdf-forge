import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings2 } from 'lucide-react'
import {
  VARIABLE_ICONS,
  type MentionVariable,
} from './variables'
import { hasConfigurableOptions } from '../../types/injectable'

export interface MentionListProps {
  items: MentionVariable[]
  command: (item: MentionVariable) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const { t } = useTranslation()
    const [selectedIndex, setSelectedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const variableItems = items

    // Reset index when items change - standard reset-on-prop-change pattern
    const itemsLength = items.length
    useEffect(() => {
      setSelectedIndex(0)
    }, [itemsLength])

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) {
          command(item)
        }
      },
      [items, command]
    )

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
          return true
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }

        return false
      },
    }))

    // Scroll selected item into view
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const selectedElement = container.querySelector(
        `[data-index="${selectedIndex}"]`
      )
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }, [selectedIndex])

    if (items.length === 0) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
          {t('editor.variablesPanel.empty.title')}
        </div>
      )
    }

    const renderItem = (item: MentionVariable, index: number) => {
      const Icon = VARIABLE_ICONS[item.type]
      const hasOptions = hasConfigurableOptions(item.formatConfig)

      return (
        <button
          key={item.id}
          data-index={index}
          onClick={() => selectItem(index)}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors',
            index === selectedIndex
              ? 'bg-accent text-foreground'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm truncate flex-1">
            {item.label}
          </span>
          {hasOptions && (
            <Settings2 className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {item.type}
          </span>
        </button>
      )
    }

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg w-72 p-1.5">
        <ScrollArea className="max-h-80" ref={containerRef}>
          {variableItems.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border">
                {t('editor.variablesPanel.sections.variables')}
              </div>
              <div className="pt-1 pb-1">
                {variableItems.map((item, index) => renderItem(item, index))}
              </div>
            </>
          )}
        </ScrollArea>
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
