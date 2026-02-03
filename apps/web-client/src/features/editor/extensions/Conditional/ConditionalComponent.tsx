import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import { cn } from '@/lib/utils'
import { GitBranch, Settings2, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { LogicBuilder } from './builder/LogicBuilder'
import type {
  ConditionalSchema,
  LogicGroup,
  LogicRule,
  RuleValue,
} from './ConditionalExtension'
import { OPERATOR_SYMBOLS } from './types/operators'

export const ConditionalComponent = (props: NodeViewProps) => {
  const { t } = useTranslation()
  const { node, updateAttributes, selected, deleteNode: _deleteNode, editor, getPos } = props
  const { conditions, expression } = node.attrs

  // Check if editor is in editable mode (not read-only/published)
  const isEditorEditable = editor.isEditable

  const [tempConditions, setTempConditions] = useState<ConditionalSchema>(
    conditions || {
      id: 'root',
      type: 'group',
      logic: 'AND',
      children: [],
    }
  )
  const [open, setOpen] = useState(false)
  const [, forceUpdate] = useState({})

  // Subscribe to selection updates to properly track direct selection
  useEffect(() => {
    const handleSelectionUpdate = () => forceUpdate({})
    editor.on('selectionUpdate', handleSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor])

  // Check if this specific node is directly selected (not just within a parent selection)
  const isDirectlySelected = useMemo(() => {
    if (!selected) return false
    const { selection } = editor.state
    const pos = getPos()
    // Verify it's a NodeSelection pointing to this exact node
    return (
      selection instanceof NodeSelection &&
      typeof pos === 'number' &&
      selection.anchor === pos
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only react to selection changes, not full state
  }, [selected, editor.state.selection, getPos])

  const handleOpenEditor = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isEditorEditable) return
    setOpen(true)
  }, [isEditorEditable])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getPos()
    if (typeof pos === 'number') {
      const tr = editor.state.tr.setSelection(
        NodeSelection.create(editor.state.doc, pos)
      )
      editor.view.dispatch(tr)
      editor.commands.deleteSelection()
    }
  }, [editor, getPos])

  const handleSelectNode = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = getPos()
      if (typeof pos === 'number') {
        const tr = editor.state.tr.setSelection(
          NodeSelection.create(editor.state.doc, pos)
        )
        editor.view.dispatch(tr)
        editor.view.focus()
      }
    },
    [editor, getPos]
  )

  const handleSave = () => {
    const summary = generateSummary(tempConditions, t)
    updateAttributes({
      conditions: tempConditions,
      expression: summary,
    })
    setOpen(false)
  }

  return (
    <NodeViewWrapper className="my-6 relative group">
      <div
        onDoubleClick={handleOpenEditor}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-4 transition-all pt-6',
          isDirectlySelected
            ? 'bg-warning-muted/50 dark:bg-warning-muted/20'
            : 'bg-warning-muted/30 dark:bg-warning-muted/10'
        )}
        style={{
          borderColor: isDirectlySelected
            ? 'hsl(var(--warning-border))'
            : 'hsl(var(--warning-border) / 0.7)',
        }}
      >
        {/* Zonas de arrastre en los bordes */}
        <div data-drag-handle onClick={handleSelectNode} className="absolute inset-x-0 top-0 h-3 cursor-grab" />
        <div data-drag-handle onClick={handleSelectNode} className="absolute inset-x-0 bottom-0 h-3 cursor-grab" />
        <div data-drag-handle onClick={handleSelectNode} className="absolute inset-y-0 left-0 w-3 cursor-grab" />
        <div data-drag-handle onClick={handleSelectNode} className="absolute inset-y-0 right-0 w-3 cursor-grab" />

        {/* Tab decorativo superior izquierdo */}
        <div data-drag-handle onClick={handleSelectNode} className="absolute -top-3 left-4 z-10 cursor-grab">
          <div
            className={cn(
              'px-2 h-6 bg-card flex items-center gap-1.5 text-xs font-medium border rounded shadow-sm transition-colors',
              isDirectlySelected
                ? 'text-warning-foreground border-warning-border dark:text-warning dark:border-warning'
                : 'text-muted-foreground border-border hover:border-warning-border hover:text-warning-foreground dark:hover:border-warning dark:hover:text-warning'
            )}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="max-w-[300px] truncate">
              {expression || t('editor.conditional.title')}
            </span>
          </div>
        </div>

        {/* Barra de herramientas flotante cuando está seleccionado y es editable */}
        {isEditorEditable && isDirectlySelected && (
          <TooltipProvider delayDuration={300}>
            <div data-toolbar className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleOpenEditor}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('editor.conditional.configure')}</p>
                </TooltipContent>
              </Tooltip>
              <div className="w-px h-6 bg-border mx-1" />
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
                <TooltipContent side="top">
                  <p>{t('editor.conditional.delete')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        <NodeViewContent className="min-h-[2rem]" />
      </div>

      {/* Dialog de configuración */}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-4xl h-[85vh] translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200 flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                  {t('editor.conditional.logicBuilder')}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm font-light text-muted-foreground">
                  {t('editor.conditional.logicBuilderDesc')}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
              <LogicBuilder
                initialData={conditions}
                onChange={setTempConditions}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border p-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {t('editor.conditional.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
              >
                {t('editor.conditional.saveConfig')}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </NodeViewWrapper>
  )
}

const generateSummary = (node: LogicGroup | LogicRule, t: (key: string) => string): string => {
  if (node.type === 'rule') {
    const r = node as LogicRule
    if (!r.variableId) return t('editor.conditional.incomplete')

    const opSymbol = OPERATOR_SYMBOLS[r.operator] || r.operator

    // Operadores sin valor
    if (['empty', 'not_empty', 'is_true', 'is_false'].includes(r.operator)) {
      return `${r.variableId} ${opSymbol}`
    }

    // Normalizar valor (compatibilidad con formato antiguo)
    const ruleValue: RuleValue =
      typeof r.value === 'string'
        ? { mode: 'text', value: r.value }
        : r.value || { mode: 'text', value: '' }

    // Con valor
    let valueDisplay: string
    if (ruleValue.mode === 'variable') {
      valueDisplay = `{${ruleValue.value || '?'}}`
    } else {
      valueDisplay = ruleValue.value ? `"${ruleValue.value}"` : '?'
    }

    return `${r.variableId} ${opSymbol} ${valueDisplay}`
  }

  const g = node as LogicGroup
  if (g.children.length === 0) return t('editor.conditional.alwaysVisibleEmpty')

  const childrenSummary = g.children.map((child) => generateSummary(child, t)).join(` ${g.logic} `)
  return g.children.length > 1 ? `(${childrenSummary})` : childrenSummary
}
