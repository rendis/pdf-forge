import { useCallback, useMemo, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import { Table2, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TableStylesPanel } from '../Table/TableStylesPanel'
import type { TableInjectorAttrs } from './types'
import type { TableColumnMeta } from '../../types/variables'
import {
  useInjectablesStore,
  selectVariableByVariableId,
} from '../../stores/injectables-store'

export function TableInjectorComponent({ node, editor, selected, deleteNode, updateAttributes }: NodeViewProps) {
  const { t, i18n } = useTranslation()
  const [stylesOpen, setStylesOpen] = useState(false)
  const attrs = node.attrs as TableInjectorAttrs

  // Get the variable from store to access metadata
  const variable = useInjectablesStore((state) =>
    attrs.variableId ? selectVariableByVariableId(state, attrs.variableId) : undefined
  )

  // Extract columns from metadata
  const columns = useMemo(() => {
    if (!variable?.metadata?.columns) return []
    return variable.metadata.columns as TableColumnMeta[]
  }, [variable?.metadata?.columns])

  // Get column label for current language
  const getColumnLabel = useCallback(
    (col: TableColumnMeta) => {
      const lang = i18n.language.split('-')[0] // "en-US" -> "en"
      return col.labels[lang] || col.labels['en'] || col.key
    },
    [i18n.language]
  )

  const handleDelete = useCallback(() => {
    deleteNode()
  }, [deleteNode])

  return (
    <NodeViewWrapper
      className={`
        relative my-4 p-4 rounded-lg border-2 border-dashed
        ${selected ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 bg-muted/50'}
        transition-colors
      `}
    >
      {/* Content */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Table2 className="w-5 h-5 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {attrs.label || t('editor.tableInjector.dynamicTable', 'Dynamic Table')}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {attrs.variableId
              ? `${t('editor.tableInjector.variable', 'Variable')}: ${attrs.variableId}`
              : t('editor.tableInjector.noVariable', 'No variable assigned')}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setStylesOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('editor.tableInjector.editStyles', 'Edit Styles')}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('editor.tableInjector.delete', 'Delete')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Column headers preview */}
      {columns.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex-shrink-0 px-3 py-1.5 bg-muted rounded text-xs font-medium text-muted-foreground border border-muted-foreground/20"
              >
                {getColumnLabel(col)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview hint */}
      <div className={`${columns.length > 0 ? 'mt-2' : 'mt-3 pt-3 border-t border-dashed border-muted-foreground/20'}`}>
        <div className="text-xs text-muted-foreground text-center">
          {t(
            'editor.tableInjector.previewHint',
            'Table content will be populated when the document is rendered'
          )}
        </div>
      </div>

      {/* Styles Panel */}
      <TableStylesPanel
        editor={editor}
        open={stylesOpen}
        onOpenChange={setStylesOpen}
        nodeType="tableInjector"
        initialStyles={node.attrs}
        onApplyStyles={updateAttributes}
      />
    </NodeViewWrapper>
  )
}
