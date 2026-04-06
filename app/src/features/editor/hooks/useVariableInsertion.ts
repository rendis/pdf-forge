import { useCallback, useMemo, useState } from 'react'
import type { UniqueIdentifier, DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import type { Editor } from '@tiptap/core'
import type { VariableDragData } from '../types/drag'
import type { PendingVariableState } from '../services/variable-insertion'
import {
  buildPendingVariableState,
  buildVariableInsertPlan,
  resolveVariableTargetSurface,
  type ActiveSurface,
} from '../services/variable-insertion'

interface DropCursorPosition {
  top: number
  left: number
  height: number
}

interface UseVariableInsertionParams {
  bodyEditor: Editor | null
  headerEditor: Editor | null
  activeSurface: ActiveSurface
  headerDropZoneId: UniqueIdentifier
}

interface InjectorChain {
  focus: (position?: number) => InjectorChain
  setInjector: (attrs: {
    type: VariableDragData['injectorType']
    label: string
    variableId: string
    format?: string
  }) => InjectorChain
  setTableInjector: (attrs: { variableId: string; label: string }) => InjectorChain
  setListInjector: (attrs: { variableId: string; label: string }) => InjectorChain
  run: () => boolean
}

function getInjectorChain(editor: Editor): InjectorChain {
  return editor.chain() as unknown as InjectorChain
}

function runInsertPlan(
  editor: Editor,
  plan: ReturnType<typeof buildVariableInsertPlan>,
  data: VariableDragData
) {
  const chain = getInjectorChain(editor).focus(plan.position)

  if (plan.command === 'setTableInjector') {
    chain.setTableInjector({ variableId: data.variableId, label: data.label }).run()
    return
  }

  if (plan.command === 'setListInjector') {
    chain.setListInjector({ variableId: data.variableId, label: data.label }).run()
    return
  }

  chain.setInjector({
    type: data.injectorType,
    label: data.label,
    variableId: data.variableId,
  }).run()
}

export interface UseVariableInsertionResult {
  activeDragData: VariableDragData | null
  dropCursorPos: DropCursorPosition | null
  formatDialogOpen: boolean
  pendingVariable: PendingVariableState | null
  handleDragEnd: (event: DragEndEvent) => void
  handleDragMove: (event: DragMoveEvent) => void
  handleDragStart: (event: DragStartEvent) => void
  handleFormatCancel: () => void
  handleFormatSelect: (format: string) => void
  handleVariableClick: (data: VariableDragData) => void
  openPendingVariableDialog: (data: VariableDragData, position: number, editor: Editor) => void
}

export function useVariableInsertion({
  bodyEditor,
  headerEditor,
  activeSurface,
  headerDropZoneId,
}: UseVariableInsertionParams): UseVariableInsertionResult {
  const [activeDragData, setActiveDragData] = useState<VariableDragData | null>(null)
  const [dropCursorPos, setDropCursorPos] = useState<DropCursorPosition | null>(null)
  const [dropPosition, setDropPosition] = useState<number | null>(null)
  const [formatDialogOpen, setFormatDialogOpen] = useState(false)
  const [pendingVariable, setPendingVariable] = useState<PendingVariableState | null>(null)
  const [pendingVariableEditor, setPendingVariableEditor] = useState<Editor | null>(null)

  const clearPendingVariable = useCallback(() => {
    setPendingVariable(null)
    setPendingVariableEditor(null)
  }, [])

  const schedulePendingVariableCleanup = useCallback(() => {
    setTimeout(clearPendingVariable, 200)
  }, [clearPendingVariable])

  const openPendingVariableDialog = useCallback(
    (data: VariableDragData, position: number, editor: Editor) => {
      setPendingVariable(buildPendingVariableState(data, position))
      setPendingVariableEditor(editor)
      setFormatDialogOpen(true)
    },
    []
  )

  const applyInsert = useCallback(
    (
      data: VariableDragData,
      targetSurface: ActiveSurface,
      options?: {
        position?: number
      }
    ) => {
      if (!bodyEditor) return

      const resolvedTargetSurface = resolveVariableTargetSurface(targetSurface, Boolean(headerEditor))
      const targetEditor = resolvedTargetSurface === 'header' ? headerEditor : bodyEditor
      if (!targetEditor) return

      const plan = buildVariableInsertPlan({
        data,
        targetSurface: resolvedTargetSurface,
        targetSelection: targetEditor.state.selection.from,
        bodySelection: bodyEditor.state.selection.from,
        position: options?.position,
      })

      const planEditor = plan.targetSurface === 'header' ? headerEditor : bodyEditor
      if (!planEditor) return

      if (plan.requiresFormat) {
        openPendingVariableDialog(data, plan.position, planEditor)
        return
      }

      runInsertPlan(planEditor, plan, data)
    },
    [bodyEditor, headerEditor, openPendingVariableDialog]
  )

  const handleFormatSelect = useCallback(
    (format: string) => {
      if (!pendingVariable) return

      const editor = pendingVariableEditor ?? bodyEditor
      if (!editor) return

      getInjectorChain(editor)
        .focus(pendingVariable.position)
        .setInjector({
          type: pendingVariable.variable.type,
          label: pendingVariable.variable.label,
          variableId: pendingVariable.variable.variableId,
          format,
        })
        .run()

      schedulePendingVariableCleanup()
    },
    [bodyEditor, pendingVariable, pendingVariableEditor, schedulePendingVariableCleanup]
  )

  const handleFormatCancel = useCallback(() => {
    schedulePendingVariableCleanup()
  }, [schedulePendingVariableCleanup])

  const handleVariableClick = useCallback(
    (data: VariableDragData) => {
      applyInsert(data, activeSurface)
    },
    [activeSurface, applyInsert]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as VariableDragData | undefined
    if (data) {
      setActiveDragData(data)
    }
  }, [])

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!bodyEditor) return

      const { activatorEvent, delta } = event
      if (!activatorEvent) return

      const pointer = activatorEvent as MouseEvent
      const position = bodyEditor.view.posAtCoords({
        left: pointer.clientX + delta.x,
        top: pointer.clientY + delta.y,
      })

      if (!position) {
        setDropCursorPos(null)
        setDropPosition(null)
        return
      }

      const coords = bodyEditor.view.coordsAtPos(position.pos)
      setDropCursorPos({
        top: coords.top,
        left: coords.left,
        height: coords.bottom - coords.top,
      })
      setDropPosition(position.pos)
    },
    [bodyEditor]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const data = event.active.data.current as VariableDragData | undefined
      const droppedOnHeader = event.over?.id === headerDropZoneId
      const positionToInsert = dropPosition

      setActiveDragData(null)
      setDropCursorPos(null)
      setDropPosition(null)

      if (!data) return

      if (droppedOnHeader) {
        applyInsert(data, 'header')
        return
      }

      applyInsert(data, 'body', {
        position: positionToInsert ?? undefined,
      })
    },
    [applyInsert, dropPosition, headerDropZoneId]
  )

  return useMemo(
    () => ({
      activeDragData,
      dropCursorPos,
      formatDialogOpen,
      pendingVariable,
      handleDragEnd,
      handleDragMove,
      handleDragStart,
      handleFormatCancel,
      handleFormatSelect,
      handleVariableClick,
      openPendingVariableDialog,
    }),
    [
      activeDragData,
      dropCursorPos,
      formatDialogOpen,
      pendingVariable,
      handleDragEnd,
      handleDragMove,
      handleDragStart,
      handleFormatCancel,
      handleFormatSelect,
      handleVariableClick,
      openPendingVariableDialog,
    ]
  )
}
