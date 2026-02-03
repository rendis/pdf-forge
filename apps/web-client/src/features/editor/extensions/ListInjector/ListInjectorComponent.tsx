import { useCallback, useRef, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import { List, Settings, Trash2, Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { TableStylesPanel } from '../Table/TableStylesPanel'
import type { ListInjectorAttrs } from './types'
import { LIST_SYMBOL_OPTIONS } from '../../types/list-input'
import {
  useInjectablesStore,
  selectVariableByVariableId,
} from '../../stores/injectables-store'

export function ListInjectorComponent({ node, editor, selected, deleteNode, updateAttributes }: NodeViewProps) {
  const { t } = useTranslation()
  const [stylesOpen, setStylesOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)
  const attrs = node.attrs as ListInjectorAttrs

  const _variable = useInjectablesStore((state) =>
    attrs.variableId ? selectVariableByVariableId(state, attrs.variableId) : undefined
  )

  const handleDelete = useCallback(() => {
    deleteNode()
  }, [deleteNode])

  const startEditingLabel = useCallback(() => {
    setLabelDraft(attrs.label || '')
    setEditingLabel(true)
    setTimeout(() => labelInputRef.current?.focus(), 0)
  }, [attrs.label])

  const commitLabel = useCallback(() => {
    const trimmed = labelDraft.trim()
    if (trimmed && trimmed !== attrs.label) {
      updateAttributes({ label: trimmed })
    }
    setEditingLabel(false)
  }, [labelDraft, attrs.label, updateAttributes])

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitLabel()
      } else if (e.key === 'Escape') {
        setEditingLabel(false)
      }
    },
    [commitLabel]
  )

  return (
    <NodeViewWrapper
      className={`
        relative my-4 p-4 rounded-lg border-2 border-dashed
        ${selected ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 bg-muted/50'}
        transition-colors
      `}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <List className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Editable label */}
          {editingLabel ? (
            <div className="flex items-center gap-1">
              <Input
                ref={labelInputRef}
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={commitLabel}
                onKeyDown={handleLabelKeyDown}
                className="h-7 text-sm font-medium px-1.5"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={commitLabel}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <div className="font-medium text-sm truncate">
                {attrs.label || t('editor.listInjector.dynamicList', 'Dynamic List')}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={startEditingLabel}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="text-xs text-muted-foreground truncate">
            {attrs.variableId
              ? `${t('editor.listInjector.variable', 'Variable')}: ${attrs.variableId}`
              : t('editor.listInjector.noVariable', 'No variable assigned')}
          </div>
        </div>

        {/* Symbol selector */}
        <div className="flex-shrink-0">
          <Select
            value={attrs.symbol || 'bullet'}
            onValueChange={(v) => updateAttributes({ symbol: v })}
          >
            <SelectTrigger className="h-8 w-auto gap-1.5 px-2.5 text-xs font-mono border-muted-foreground/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {LIST_SYMBOL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono w-4 text-center">{opt.marker}</span>
                    <span>{t(opt.i18nKey)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              {t('editor.listInjector.editStyles', 'Edit Styles')}
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
              {t('editor.listInjector.delete', 'Delete')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
        <div className="text-xs text-muted-foreground text-center">
          {t(
            'editor.listInjector.previewHint',
            'List content will be populated when the document is rendered'
          )}
        </div>
      </div>

      <TableStylesPanel
        editor={editor}
        open={stylesOpen}
        onOpenChange={setStylesOpen}
        nodeType="listInjector"
        initialStyles={node.attrs}
        onApplyStyles={updateAttributes}
      />
    </NodeViewWrapper>
  )
}
