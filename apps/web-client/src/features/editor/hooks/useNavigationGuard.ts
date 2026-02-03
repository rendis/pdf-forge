/**
 * Navigation Guard Hook
 *
 * Ensures document changes are saved before navigating away from the editor.
 * Uses TanStack Router's useBlocker for in-app navigation and beforeunload
 * for browser close/refresh.
 */

import { useBlocker } from '@tanstack/react-router'
import { useCallback, useRef } from 'react'
import type { AutoSaveStatus } from './useAutoSave'

export interface UseNavigationGuardOptions {
  isDirty: boolean
  status: AutoSaveStatus
  save: () => Promise<void>
  enabled?: boolean
}

/**
 * Protects the editor from losing unsaved changes on navigation.
 * Triggers an immediate save when the user attempts to leave.
 */
export function useNavigationGuard({
  isDirty,
  status,
  save,
  enabled = true,
}: UseNavigationGuardOptions): void {
  const isSavingOnExitRef = useRef(false)

  const hasUnsavedChanges = isDirty || status === 'pending'

  const handleNavigationAttempt = useCallback(async (): Promise<boolean> => {
    // If no unsaved changes or already handling exit, allow navigation
    if (!hasUnsavedChanges || isSavingOnExitRef.current) {
      return false // Don't block
    }

    // Mark that we're handling exit save
    isSavingOnExitRef.current = true

    try {
      // Save immediately without debounce
      await save()
    } catch (error) {
      // Log error but still allow navigation
      // User can come back and the auto-save will retry
      console.warn('Failed to save on navigation:', error)
    } finally {
      isSavingOnExitRef.current = false
    }

    // Allow navigation after save attempt
    return false // Don't block
  }, [hasUnsavedChanges, save])

  useBlocker({
    shouldBlockFn: handleNavigationAttempt,
    disabled: !enabled,
    enableBeforeUnload: enabled && hasUnsavedChanges,
  })
}
