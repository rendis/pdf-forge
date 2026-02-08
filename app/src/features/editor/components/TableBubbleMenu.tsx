import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  TableCellsMerge,
  Heading,
  Grid2x2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TableBubbleMenuProps {
  editor: Editor
}

function DropdownContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <DropdownMenuPrimitive.Content
      align="center"
      sideOffset={8}
      className={cn(
        'z-[60] min-w-[180px] overflow-hidden rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
    >
      {children}
    </DropdownMenuPrimitive.Content>
  )
}

function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

function DropdownItem({
  children,
  className,
  disabled,
  destructive,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  destructive?: boolean
  onClick?: () => void
}) {
  return (
    <DropdownMenuPrimitive.Item
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none',
        'transition-colors focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive &&
          'text-destructive focus:text-destructive focus:bg-destructive/10',
        className
      )}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  )
}

function DropdownSeparator() {
  return (
    <DropdownMenuPrimitive.Separator className="my-1.5 h-px bg-border" />
  )
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const { t } = useTranslation()

  const isInFirstRow = useMemo(() => {
    const { $from } = editor.state.selection
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d)
      if (node.type.name === 'tableRow') {
        const table = $from.node(d - 1)
        if (table?.type.name === 'table') {
          return table.firstChild === node
        }
      }
    }
    return false
  }, [editor.state.selection])

  const hasHeaderRow = useMemo(() => {
    const { $from } = editor.state.selection
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d)
      if (node.type.name === 'table') {
        const firstRow = node.firstChild
        return firstRow?.firstChild?.type.name === 'tableHeader'
      }
    }
    return false
  }, [editor.state.selection])

  const canAddRowAbove = !(isInFirstRow && hasHeaderRow)

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) => editor.isActive('table')}
      options={{
        placement: 'top',
        offset: 8,
      }}
      className="rounded-lg border bg-popover shadow-lg"
    >
      <DropdownMenuPrimitive.Root>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuPrimitive.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
              >
                <Grid2x2 className="h-4 w-4" />
              </Button>
            </DropdownMenuPrimitive.Trigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            {t('editor.table.options')}
          </TooltipContent>
        </Tooltip>

        <DropdownContent>
          {/* Rows Section */}
          <DropdownLabel>{t('editor.table.rows')}</DropdownLabel>
          <DropdownItem
            disabled={!canAddRowAbove}
            onClick={() => editor.chain().focus().addRowBefore().run()}
          >
            <ArrowUp className="h-4 w-4 mr-2 opacity-60" />
            {t('editor.table.addRowAbove')}
          </DropdownItem>
          <DropdownItem
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <ArrowDown className="h-4 w-4 mr-2 opacity-60" />
            {t('editor.table.addRowBelow')}
          </DropdownItem>
          <DropdownItem
            destructive
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('editor.table.deleteRow')}
          </DropdownItem>

          <DropdownSeparator />

          {/* Columns Section */}
          <DropdownLabel>{t('editor.table.columns')}</DropdownLabel>
          <DropdownItem
            onClick={() => editor.chain().focus().addColumnBefore().run()}
          >
            <ArrowLeft className="h-4 w-4 mr-2 opacity-60" />
            {t('editor.table.addColumnLeft')}
          </DropdownItem>
          <DropdownItem
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <ArrowRight className="h-4 w-4 mr-2 opacity-60" />
            {t('editor.table.addColumnRight')}
          </DropdownItem>
          <DropdownItem
            destructive
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('editor.table.deleteColumn')}
          </DropdownItem>

          <DropdownSeparator />

          {/* Settings Section */}
          <DropdownLabel>{t('editor.table.settings')}</DropdownLabel>
          <DropdownItem
            onClick={() => editor.chain().focus().mergeOrSplit().run()}
          >
            <TableCellsMerge className="h-4 w-4 mr-2 opacity-60" />
            {t('editor.table.mergeSplit')}
          </DropdownItem>
          <DropdownItem
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          >
            <Heading className="h-4 w-4 mr-2 opacity-60" />
            {t('editor.table.toggleHeader')}
          </DropdownItem>
        </DropdownContent>
      </DropdownMenuPrimitive.Root>
    </BubbleMenu>
  )
}
