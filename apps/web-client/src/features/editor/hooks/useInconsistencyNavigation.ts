import { useCallback } from 'react'
import type { Editor } from '@tiptap/core'

interface UseInconsistencyNavigationReturn {
  /** Total count of invalid injectables */
  count: number
  /** Current navigation index (-1 if not navigating) */
  currentIndex: number
  /** List of invalid nodes */
  invalidNodes: never[]
  /** Navigate to next invalid node */
  next: () => void
  /** Navigate to previous invalid node */
  prev: () => void
  /** Navigate to specific index */
  navigateTo: (index: number) => void
  /** Reset navigation state */
  reset: () => void
}

/**
 * Hook to find and navigate between invalid injectables in the editor.
 * Currently a no-op since role-based inconsistencies have been removed.
 */
export function useInconsistencyNavigation(
  _editor: Editor | null
): UseInconsistencyNavigationReturn {
  const noop = useCallback(() => {}, [])
  const noopIndex = useCallback((_index: number) => {}, [])

  return {
    count: 0,
    currentIndex: -1,
    invalidNodes: [],
    next: noop,
    prev: noop,
    navigateTo: noopIndex,
    reset: noop,
  }
}
