import { useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CheckSquare,
  Coins,
  Hash,
  Image as ImageIcon,
  Table,
  Type,
} from 'lucide-react'
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useInjectablesStore } from '../../stores/injectables-store'

const icons = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
}

export const InjectorComponent = (props: NodeViewProps) => {
  const { node, selected, deleteNode } = props
  const { label, type, format, variableId } = node.attrs

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  // Look up current label from store (updates when language changes)
  const currentLabel = useInjectablesStore(
    (s) => s.variables.find((v) => v.variableId === variableId)?.label
  )

  const displayCode = variableId || 'variable'
  const displayName = currentLabel || label || 'Variable'
  const Icon = icons[type as keyof typeof icons] || Type

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const chipContent = (
    <span
      contentEditable={false}
      onContextMenu={handleContextMenu}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium transition-all duration-200 ease-out select-none',
        selected
          ? 'ring-2 ring-ring'
          : '',
        [
          'border',
          // Light mode: gray (variables regulares - estilo diseño base)
          'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 hover:border-gray-300',
          // Dark mode: info (cyan) with dashed border
          'dark:bg-info-muted dark:text-info-foreground dark:hover:bg-info-muted/80 dark:border-dashed dark:border-info-border',
        ]
      )}
    >
      <Icon className="h-3 w-3" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{displayCode}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {displayName}
        </TooltipContent>
      </Tooltip>
      {format && (
        <span className="text-[10px] opacity-70 bg-background/50 px-1 rounded font-mono">
          {format}
        </span>
      )}
    </span>
  )

  return (
    <NodeViewWrapper as="span" className="mx-1">
      {chipContent}

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="injector"
          onDelete={deleteNode}
          onClose={() => setContextMenu(null)}
        />
      )}
    </NodeViewWrapper>
  )
}
