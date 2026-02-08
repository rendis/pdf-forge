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
import { groupCommands, type SlashCommand } from './commands'

export interface SlashCommandsListProps {
  items: SlashCommand[]
  command: (item: SlashCommand) => void
}

export interface SlashCommandsListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const SlashCommandsList = forwardRef<SlashCommandsListRef, SlashCommandsListProps>(
  ({ items, command }, ref) => {
    const { t } = useTranslation()
    const [selectedIndex, setSelectedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const groupedItems = groupCommands(items, t)
    const flatItems = items

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const selectItem = useCallback(
      (index: number) => {
        const item = flatItems[index]
        if (item) {
          command(item)
        }
      },
      [flatItems, command]
    )

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length)
          return true
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % flatItems.length)
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

      const selectedElement = container.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }, [selectedIndex])

    if (items.length === 0) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
          {t('editor.slashCommands.noCommandsFound')}
        </div>
      )
    }

    let globalIndex = 0

    return (
      <div className="bg-popover border rounded-lg shadow-lg w-72 p-1.5">
        <ScrollArea className="max-h-80" ref={containerRef}>
          <div className="py-1.5">
            {Object.entries(groupedItems).map(([group, commands]) => (
              <div key={group}>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group}
                </div>
                {commands.map((item) => {
                  const currentIndex = globalIndex++
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      data-index={currentIndex}
                      onClick={() => selectItem(currentIndex)}
                      className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left transition-colors',
                        currentIndex === selectedIndex
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted border">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{t(item.titleKey)}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t(item.descriptionKey)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }
)

SlashCommandsList.displayName = 'SlashCommandsList'
