import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CheckSquare,
  Coins,
  Hash,
  Image as ImageIcon,
  Settings2,
  Table,
  Type,
} from 'lucide-react'
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu'
import { InjectorConfigDialog } from '../../components/InjectorConfigDialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useInjectablesStore } from '../../stores/injectables-store'
import type { InjectorType } from '../../types/variables'

const icons = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
}

// Scalar types that support label configuration and resize
const SCALAR_TYPES: InjectorType[] = ['TEXT', 'NUMBER', 'DATE', 'CURRENCY', 'BOOLEAN']

const MIN_WIDTH = 40

export const InjectorComponent = (props: NodeViewProps) => {
  const { node, selected, deleteNode, updateAttributes, editor, getPos } = props
  const { label, type, format, variableId, prefix, suffix, showLabelIfEmpty, defaultValue, width } = node.attrs

  const chipRef = useRef<HTMLSpanElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const handleSelectionUpdate = () => forceUpdate({})
    editor.on('selectionUpdate', handleSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor])

  const isDirectlySelected = useMemo(() => {
    if (!selected) return false
    const { selection } = editor.state
    const pos = getPos()
    return (
      selection instanceof NodeSelection &&
      typeof pos === 'number' &&
      selection.anchor === pos
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editor.state.selection, getPos])

  const isEditorEditable = editor.isEditable

  const currentLabel = useInjectablesStore(
    (s) => s.variables.find((v) => v.variableId === variableId)?.label
  )

  const displayCode = variableId || 'variable'
  const displayName = currentLabel || label || 'Variable'
  const Icon = icons[type as keyof typeof icons] || Type

  const supportsLabelConfig = SCALAR_TYPES.includes(type as InjectorType)

  // Measure natural (auto) content width by temporarily removing explicit width
  const getNaturalWidth = useCallback(() => {
    const chip = chipRef.current
    if (!chip) return 200
    const prev = chip.style.width
    chip.style.width = ''
    const natural = chip.getBoundingClientRect().width
    chip.style.width = prev
    return natural
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleConfigureLabel = () => {
    setConfigDialogOpen(true)
  }

  const handleApplyConfig = (config: {
    prefix?: string | null
    suffix?: string | null
    showLabelIfEmpty?: boolean
    defaultValue?: string | null
  }) => {
    updateAttributes(config)
  }

  const handleClearWidth = useCallback(() => {
    updateAttributes({ width: null })
    if (chipRef.current) {
      chipRef.current.style.width = ''
    }
  }, [updateAttributes])

  // Custom drag-to-resize from the right edge
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const chip = chipRef.current
      if (!chip) return

      const startX = e.clientX
      const startWidth = chip.getBoundingClientRect().width
      const naturalWidth = getNaturalWidth()
      let currentWidth = startWidth

      setIsResizing(true)

      const onPointerMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX
        currentWidth = Math.max(MIN_WIDTH, Math.min(startWidth + delta, naturalWidth))
        chip.style.width = `${currentWidth}px`
      }

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)

        const finalWidth = Math.round(currentWidth)
        // Update TipTap attribute BEFORE clearing isResizing to prevent
        // a re-render flash that resets the inline style
        updateAttributes({ width: finalWidth >= MIN_WIDTH ? finalWidth : null })
        setIsResizing(false)
      }

      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
    },
    [getNaturalWidth, updateAttributes]
  )

  useEffect(() => {
    if (chipRef.current && width) {
      chipRef.current.style.width = `${width}px`
    }
  }, [width])

  const showResizeHandle = isEditorEditable && supportsLabelConfig && (isDirectlySelected || isResizing)

  return (
    <NodeViewWrapper as="span" className="mx-1" style={{ position: 'relative', display: 'inline' }}>
      <span
        ref={chipRef}
        contentEditable={false}
        onContextMenu={handleContextMenu}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium transition-all duration-200 ease-out select-none',
          selected
            ? 'ring-2 ring-ring'
            : '',
          [
            'border',
            'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 hover:border-gray-300',
            'dark:bg-info-muted dark:text-info-foreground dark:hover:bg-info-muted/80 dark:border-dashed dark:border-info-border',
          ]
        )}
        style={{
          width: width ? `${width}px` : undefined,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {prefix && (
          <span className="text-[10px] opacity-70 font-normal">
            {prefix}
          </span>
        )}
        <Icon className="h-3 w-3 flex-shrink-0" />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default truncate">{displayCode}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {displayName}
          </TooltipContent>
        </Tooltip>
        {suffix && (
          <span className="text-[10px] opacity-70 font-normal">
            {suffix}
          </span>
        )}
        {format && (
          <span className="text-[10px] opacity-70 bg-background/50 px-1 rounded font-mono">
            {format}
          </span>
        )}
        {(showLabelIfEmpty || defaultValue) && (
          <Settings2 className="h-2.5 w-2.5 opacity-50 flex-shrink-0" />
        )}
      </span>

      {showResizeHandle && (
        <span
          onPointerDown={handleResizePointerDown}
          className="absolute top-0 -right-1 w-2 h-full cursor-ew-resize z-10 flex items-center justify-center"
          contentEditable={false}
        >
          <span className="w-0.5 h-3/4 rounded-full bg-primary/60" />
        </span>
      )}

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="injector"
          onDelete={deleteNode}
          onConfigureLabel={supportsLabelConfig ? handleConfigureLabel : undefined}
          onClearWidth={width ? handleClearWidth : undefined}
          onClose={() => setContextMenu(null)}
        />
      )}

      {supportsLabelConfig && (
        <InjectorConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          injectorType={type as InjectorType}
          variableId={variableId}
          variableLabel={displayName}
          currentConfig={{
            prefix,
            suffix,
            showLabelIfEmpty,
            defaultValue,
            format,
          }}
          onApply={handleApplyConfig}
        />
      )}
    </NodeViewWrapper>
  )
}
