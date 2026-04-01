import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { useInjectablesStore } from '../stores/injectables-store'

interface InvalidNode {
  pos: number
  variableId: string
}

interface UseInconsistencyNavigationReturn {
  /** Total count of invalid injectables */
  count: number
  /** Current navigation index (-1 if not navigating) */
  currentIndex: number
  /** List of invalid nodes */
  invalidNodes: InvalidNode[]
  /** Navigate to next invalid node */
  next: () => void
  /** Navigate to previous invalid node */
  prev: () => void
  /** Navigate to specific index */
  navigateTo: (index: number) => void
  /** Reset navigation state */
  reset: () => void
}

const INJECTOR_TYPES = new Set(['injector', 'tableInjector', 'listInjector'])
const DEBOUNCE_MS = 300

/**
 * Hook to find and navigate between invalid injectables in the editor.
 * An injectable is invalid when its variableId is not found in the
 * available variables from the injectables store.
 */
export function useInconsistencyNavigation(
  editor: Editor | null
): UseInconsistencyNavigationReturn {
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [docVersion, setDocVersion] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const variables = useInjectablesStore((s) => s.variables)

  // Subscribe to editor document changes (debounced)
  useEffect(() => {
    if (!editor) return
    const onUpdate = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setDocVersion((v) => v + 1), DEBOUNCE_MS)
    }
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
      clearTimeout(timerRef.current)
    }
  }, [editor])

  const invalidNodes = useMemo(() => {
    // docVersion included to re-run on editor changes
    void docVersion
    if (!editor) return []

    const variableIds = new Set(variables.map((v) => v.variableId))
    const nodes: InvalidNode[] = []

    editor.state.doc.descendants((node, pos) => {
      if (!INJECTOR_TYPES.has(node.type.name)) return
      const vid = node.attrs.variableId as string | undefined
      if (vid && !variableIds.has(vid)) {
        nodes.push({ pos, variableId: vid })
      }
    })

    return nodes
  }, [editor, docVersion, variables])

  const normalizedCurrentIndex = useMemo(() => {
    if (invalidNodes.length === 0) {
      return -1
    }
    return currentIndex >= invalidNodes.length ? 0 : currentIndex
  }, [currentIndex, invalidNodes.length])

  const selectNode = useCallback(
    (index: number) => {
      if (!editor || index < 0 || index >= invalidNodes.length) return
      const { pos } = invalidNodes[index]
      try {
        const { tr } = editor.state
        tr.setSelection(NodeSelection.create(editor.state.doc, pos))
        editor.view.dispatch(tr.scrollIntoView())
        setCurrentIndex(index)
      } catch {
        // Position is stale after a document edit; force rescan
        setDocVersion((v) => v + 1)
      }
    },
    [editor, invalidNodes]
  )

  const next = useCallback(() => {
    if (invalidNodes.length === 0) return
    const nextIdx = currentIndex < 0 ? 0 : (currentIndex + 1) % invalidNodes.length
    selectNode(nextIdx)
  }, [currentIndex, invalidNodes.length, selectNode])

  const prev = useCallback(() => {
    if (invalidNodes.length === 0) return
    const prevIdx =
      normalizedCurrentIndex <= 0 ? invalidNodes.length - 1 : normalizedCurrentIndex - 1
    selectNode(prevIdx)
  }, [invalidNodes.length, normalizedCurrentIndex, selectNode])

  const navigateTo = useCallback(
    (index: number) => selectNode(index),
    [selectNode]
  )

  const reset = useCallback(() => setCurrentIndex(-1), [])

  return {
    count: invalidNodes.length,
    currentIndex: normalizedCurrentIndex,
    invalidNodes,
    next,
    prev,
    navigateTo,
    reset,
  }
}
