import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Pencil, Copy, Scissors, Settings, Maximize2 } from 'lucide-react'

export type NodeContextType =
  | 'injector'
  | 'conditional'
  | 'pageBreak'

interface EditorNodeContextMenuProps {
  x: number
  y: number
  nodeType: NodeContextType
  onDelete: () => void
  onEdit?: () => void
  onCopy?: () => void
  onCut?: () => void
  onConfigureLabel?: () => void
  onClearWidth?: () => void
  onClose: () => void
}

export const EditorNodeContextMenu = ({
  x,
  y,
  nodeType,
  onDelete,
  onEdit,
  onCopy,
  onCut,
  onConfigureLabel,
  onClearWidth,
  onClose,
}: EditorNodeContextMenuProps) => {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)

  const nodeTypeLabel = {
    injector: t('editor.context_menu.node_types.variable'),
    conditional: t('editor.context_menu.node_types.conditional'),
    pageBreak: t('editor.context_menu.node_types.page_break'),
  }[nodeType]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(x, window.innerWidth - 180),
    y: Math.min(y, window.innerHeight - 120),
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {onConfigureLabel && (
        <button
          onClick={() => {
            onConfigureLabel()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{t('editor.context_menu.configure_label')}</span>
        </button>
      )}

      {onClearWidth && (
        <button
          onClick={() => {
            onClearWidth()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
        >
          <Maximize2 className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{t('editor.context_menu.reset_width')}</span>
        </button>
      )}

      {onEdit && (
        <button
          onClick={() => {
            onEdit()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
        >
          <Pencil className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{t('editor.context_menu.edit')} {nodeTypeLabel}</span>
        </button>
      )}

      {onCopy && (
        <button
          onClick={() => {
            onCopy()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
        >
          <Copy className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{t('editor.context_menu.copy')}</span>
        </button>
      )}

      {onCut && (
        <button
          onClick={() => {
            onCut()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
        >
          <Scissors className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{t('editor.context_menu.cut')}</span>
        </button>
      )}

      <button
        onClick={() => {
          onDelete()
          onClose()
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-accent transition-colors text-left"
      >
        <Trash2 className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{t('editor.context_menu.delete')}</span>
      </button>
    </div>
  )
}
