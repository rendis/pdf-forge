/**
 * Auto-Save Hook
 *
 * Implements Google Docs-style auto-saving with debounce,
 * retry logic, and status indication.
 *
 * Copied from legacy system (../web-client) and adapted for v2 stores.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { versionsApi } from '@/features/templates/api/templates-api'
import { exportDocument } from '../services/document-export'
import { usePaginationStore } from '../stores/pagination-store'
import type { DocumentMeta } from '../types/document-format'

// =============================================================================
// Types
// =============================================================================

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface AutoSaveState {
  status: AutoSaveStatus
  lastSavedAt: Date | null
  error: Error | null
  isDirty: boolean
}

export interface UseAutoSaveOptions {
  editor: Editor | null
  templateId: string
  versionId: string
  enabled: boolean
  debounceMs?: number
  meta?: Partial<DocumentMeta>
}

export interface UseAutoSaveReturn extends AutoSaveState {
  save: () => Promise<void>
  resetError: () => void
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DEBOUNCE_MS = 2000
const MAX_RETRIES = 2
const SAVED_DISPLAY_MS = 3000

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAutoSave({
  editor,
  templateId,
  versionId,
  enabled,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  meta,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  // State
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const isSavingRef = useRef(false)

  // Store data - v2 has individual properties, not a `config` object
  const pageSize = usePaginationStore((s) => s.pageSize)
  const margins = usePaginationStore((s) => s.margins)

  // Build pagination config in the format expected by exportDocument
  const pagination = useMemo(() => ({
    pageSize,
    margins,
  }), [pageSize, margins])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  /**
   * Core save function
   */
  const performSave = useCallback(async () => {
    if (!editor || !enabled || isSavingRef.current) return

    isSavingRef.current = true
    setStatus('saving')
    setError(null)

    try {
      // Build document meta
      const documentMeta: DocumentMeta = {
        title: meta?.title || 'Untitled',
        description: meta?.description,
        language: meta?.language || 'es',
        customFields: meta?.customFields,
      }

      // Export document
      const portableDoc = exportDocument(
        editor,
        { pagination },
        documentMeta,
        { includeChecksum: true }
      )

      // Send document directly as JSON object
      const contentStructure = portableDoc

      // Call API
      await versionsApi.update(templateId, versionId, { contentStructure })

      // Success
      setStatus('saved')
      setLastSavedAt(new Date())
      setIsDirty(false)
      retryCountRef.current = 0

      // Reset to idle after display time
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        setStatus('idle')
      }, SAVED_DISPLAY_MS)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed')

      // Retry logic
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        isSavingRef.current = false
        // Retry after a short delay
        setTimeout(() => performSave(), 1000)
        return
      }

      // Max retries reached
      setStatus('error')
      setError(error)
      retryCountRef.current = 0
    } finally {
      isSavingRef.current = false
    }
  }, [
    editor,
    enabled,
    templateId,
    versionId,
    meta,
    pagination,
  ])

  /**
   * Manual save (force, no debounce)
   */
  const save = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    await performSave()
  }, [performSave])

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null)
    setStatus(isDirty ? 'pending' : 'idle')
  }, [isDirty])

  /**
   * Schedule debounced save
   */
  const scheduleSave = useCallback(() => {
    if (!enabled) return

    setIsDirty(true)
    setStatus('pending')

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      performSave()
    }, debounceMs)
  }, [enabled, debounceMs, performSave])

  /**
   * Listen to editor updates
   */
  useEffect(() => {
    if (!editor || !enabled) return

    const handleUpdate = () => {
      scheduleSave()
    }

    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, enabled, scheduleSave])

  return {
    status,
    lastSavedAt,
    error,
    isDirty,
    save,
    resetError,
  }
}
