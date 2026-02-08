import { useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Scissors } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu'

export const PageBreakHRComponent = (props: NodeViewProps) => {
  const { selected, deleteNode } = props
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <NodeViewWrapper>
      <div
        data-drag-handle
        contentEditable={false}
        onContextMenu={handleContextMenu}
        className={cn(
          'page-break-node cursor-grab select-none my-6',
          selected && 'outline outline-2 outline-muted-foreground outline-offset-2'
        )}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Línea con icono de tijeras en el centro */}
        <div className="flex items-center w-full">
          {/* Línea izquierda */}
          <div
            className={cn(
              'flex-1 border-t-2 border-dashed transition-colors',
              selected ? 'border-muted-foreground' : 'border-border'
            )}
          />

          {/* Icono de tijeras centrado */}
          <div className="px-2 flex items-center">
            <Scissors
              className={cn(
                'w-4 h-4 transition-colors',
                selected ? 'text-foreground' : 'text-muted-foreground'
              )}
            />
          </div>

          {/* Línea derecha */}
          <div
            className={cn(
              'flex-1 border-t-2 border-dashed transition-colors',
              selected ? 'border-muted-foreground' : 'border-border'
            )}
          />
        </div>
      </div>

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="pageBreak"
          onDelete={deleteNode}
          onClose={() => setContextMenu(null)}
        />
      )}
    </NodeViewWrapper>
  )
}
