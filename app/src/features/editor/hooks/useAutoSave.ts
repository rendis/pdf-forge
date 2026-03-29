/**
 * Auto-Save Hook
 *
 * Implements Google Docs-style auto-saving with debounce,
 * retry logic, and status indication.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { versionsApi } from '@/features/templates/api/templates-api'
import { exportDocument } from '../services/document-export'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { usePaginationStore } from '../stores/pagination-store'
import type { DocumentMeta } from '../types/document-format'

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
  ensureSaved: () => Promise<void>
  resetError: () => void
}

const DEFAULT_DEBOUNCE_MS = 2000
const MAX_RETRIES = 2
const SAVED_DISPLAY_MS = 3000

export function useAutoSave({
  editor,
  templateId,
  versionId,
  enabled,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  meta,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const isInitializedRef = useRef(false)
  const savePromiseRef = useRef<Promise<void> | null>(null)
  const prevHeaderRef = useRef<string | null>(null)

  const pageSize = usePaginationStore((s) => s.pageSize)
  const margins = usePaginationStore((s) => s.margins)
  const headerLayout = useDocumentHeaderStore((s) => s.layout)
  const headerImageUrl = useDocumentHeaderStore((s) => s.imageUrl)
  const headerImageAlt = useDocumentHeaderStore((s) => s.imageAlt)
  const headerImageInjectableId = useDocumentHeaderStore((s) => s.imageInjectableId)
  const headerImageInjectableLabel = useDocumentHeaderStore((s) => s.imageInjectableLabel)
  const headerImageWidth = useDocumentHeaderStore((s) => s.imageWidth)
  const headerImageHeight = useDocumentHeaderStore((s) => s.imageHeight)
  const headerContent = useDocumentHeaderStore((s) => s.content)

  const headerSnapshot = useMemo(
    () =>
      JSON.stringify({
        layout: headerLayout,
        imageUrl: headerImageUrl,
        imageAlt: headerImageAlt,
        imageInjectableId: headerImageInjectableId,
        imageInjectableLabel: headerImageInjectableLabel,
        imageWidth: headerImageWidth,
        imageHeight: headerImageHeight,
        content: headerContent,
      }),
    [
      headerContent,
      headerImageAlt,
      headerImageHeight,
      headerImageInjectableId,
      headerImageInjectableLabel,
      headerImageUrl,
      headerImageWidth,
      headerLayout,
    ]
  )

  const pagination = useMemo(
    () => ({
      pageSize,
      margins,
    }),
    [pageSize, margins]
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!enabled || isInitializedRef.current) return

    const timer = setTimeout(() => {
      prevHeaderRef.current = headerSnapshot
      isInitializedRef.current = true
    }, 100)

    return () => clearTimeout(timer)
  }, [enabled, headerSnapshot])

  const performSave = useCallback(() => {
    if (!editor || !enabled) {
      return Promise.resolve()
    }

    if (savePromiseRef.current) {
      return savePromiseRef.current
    }

    const savePromise = (async () => {
      setStatus('saving')
      setError(null)

      try {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const documentMeta: DocumentMeta = {
              title: meta?.title || 'Untitled',
              description: meta?.description,
              language: meta?.language || 'es',
              customFields: meta?.customFields,
            }

            const portableDoc = exportDocument(
              editor,
              { pagination },
              documentMeta,
              { includeChecksum: true }
            )

            await versionsApi.update(templateId, versionId, { contentStructure: portableDoc })

            setStatus('saved')
            setLastSavedAt(new Date())
            setIsDirty(false)
            retryCountRef.current = 0

            if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
            savedTimerRef.current = setTimeout(() => {
              setStatus('idle')
            }, SAVED_DISPLAY_MS)

            return
          } catch (err) {
            const saveError = err instanceof Error ? err : new Error('Save failed')

            if (attempt < MAX_RETRIES) {
              retryCountRef.current = attempt + 1
              await new Promise((resolve) => setTimeout(resolve, 1000))
              continue
            }

            setStatus('error')
            setError(saveError)
            retryCountRef.current = 0
            throw saveError
          }
        }
      } finally {
        // noop
      }
    })()

    const trackedPromise = savePromise.finally(() => {
      if (savePromiseRef.current === trackedPromise) {
        savePromiseRef.current = null
      }
    })
    savePromiseRef.current = trackedPromise

    return trackedPromise
  }, [editor, enabled, meta, pagination, templateId, versionId])

  const save = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    try {
      await performSave()
    } catch {
      // performSave already updates UI state.
    }
  }, [performSave])

  const ensureSaved = useCallback(async () => {
    if (!enabled || !editor) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (savePromiseRef.current) {
      await savePromiseRef.current
      return
    }

    if (isDirty || status === 'pending') {
      await performSave()
    }
  }, [editor, enabled, isDirty, performSave, status])

  const resetError = useCallback(() => {
    setError(null)
    setStatus(isDirty ? 'pending' : 'idle')
  }, [isDirty])

  const scheduleSave = useCallback(() => {
    if (!enabled) return

    setIsDirty(true)
    setStatus('pending')

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void performSave().catch(() => {
        // performSave already updates UI state.
      })
    }, debounceMs)
  }, [debounceMs, enabled, performSave])

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

  useEffect(() => {
    if (!enabled || !isInitializedRef.current) return

    if (prevHeaderRef.current !== headerSnapshot) {
      prevHeaderRef.current = headerSnapshot
      scheduleSave()
    }
  }, [enabled, headerSnapshot, scheduleSave])

  return {
    status,
    lastSavedAt,
    error,
    isDirty,
    save,
    ensureSaved,
    resetError,
  }
}
