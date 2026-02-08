import type { Editor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { Copy, Scissors, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TableCornerHandleProps {
  editor: Editor
}

const HANDLE_HEIGHT = 36

/**
 * Find the table node position from the current selection
 */
function findTablePosition(editor: Editor): number | null {
  const { $from } = editor.state.selection
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'table') {
      return $from.before(d)
    }
  }
  return null
}

/**
 * Copy the table to clipboard as HTML and plain text
 */
async function copyTable(editor: Editor): Promise<boolean> {
  const tablePos = findTablePosition(editor)
  if (tablePos === null) return false

  // Get the DOM element for the table
  const domNode = editor.view.nodeDOM(tablePos) as HTMLElement | null
  if (!domNode) return false

  try {
    // Clone the DOM element to get clean HTML
    const clone = domNode.cloneNode(true) as HTMLElement
    const html = clone.outerHTML
    const plainText = domNode.textContent || ''

    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      }),
    ])

    return true
  } catch {
    // Fallback to text-only copy
    try {
      await navigator.clipboard.writeText(domNode.textContent || '')
      return true
    } catch {
      return false
    }
  }
}

/**
 * Cut the table (copy + delete)
 */
async function cutTable(editor: Editor): Promise<boolean> {
  const copied = await copyTable(editor)
  if (copied) {
    editor.chain().focus().deleteTable().run()
  }
  return copied
}

export function TableCornerHandle({ editor }: TableCornerHandleProps) {
  const { t } = useTranslation()
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isInTable, setIsInTable] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Update position and table state when selection changes or on scroll
  useEffect(() => {
    const updatePosition = () => {
      const inTable = editor.isActive('table')
      setIsInTable(inTable)

      if (!inTable) {
        setPosition(null)
        return
      }

      const tablePos = findTablePosition(editor)
      if (tablePos === null) {
        setPosition(null)
        return
      }

      // Get the DOM element for the table
      const domNode = editor.view.nodeDOM(tablePos) as HTMLElement | null
      if (!domNode) {
        setPosition(null)
        return
      }

      // Find the editor container (the scrollable parent)
      const editorContainer = editor.view.dom.closest('.overflow-auto')
      if (!editorContainer) {
        setPosition(null)
        return
      }

      const tableRect = domNode.getBoundingClientRect()
      const containerRect = editorContainer.getBoundingClientRect()

      // Calculate position relative to the scrollable container
      // Position handle close to table (compensate for CSS margin on table)
      setPosition({
        top: tableRect.top - containerRect.top + editorContainer.scrollTop - HANDLE_HEIGHT + 12,
        left: tableRect.left - containerRect.left + editorContainer.scrollLeft,
      })
    }

    // Initial update
    updatePosition()

    // Listen to editor updates
    editor.on('selectionUpdate', updatePosition)
    editor.on('transaction', updatePosition)

    // Listen to scroll events on the editor container
    const editorContainer = editor.view.dom.closest('.overflow-auto')
    if (editorContainer) {
      editorContainer.addEventListener('scroll', updatePosition)
    }

    return () => {
      editor.off('selectionUpdate', updatePosition)
      editor.off('transaction', updatePosition)
      if (editorContainer) {
        editorContainer.removeEventListener('scroll', updatePosition)
      }
    }
  }, [editor])

  // Don't render if not in table or no position
  if (!isInTable || !position) return null

  return (
    <div
      ref={containerRef}
      className="absolute z-50 flex gap-0.5 bg-popover border border-border rounded-md p-0.5 shadow-md"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => copyTable(editor)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{t('editor.table.copyTable')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => cutTable(editor)}
          >
            <Scissors className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{t('editor.table.cutTable')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{t('editor.table.deleteTable')}</TooltipContent>
      </Tooltip>
    </div>
  )
}
