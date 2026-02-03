import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, AlertCircle, Save, RefreshCw, Lock } from 'lucide-react'
import { DocumentEditor } from '@/features/editor/components/DocumentEditor'
import { DocumentPreparationOverlay } from '@/features/editor/components/DocumentPreparationOverlay'
import { SaveStatusIndicator } from '@/features/editor/components/SaveStatusIndicator'
import { useInjectables } from '@/features/editor/hooks/useInjectables'
import { useAutoSave } from '@/features/editor/hooks/useAutoSave'
import { useNavigationGuard } from '@/features/editor/hooks/useNavigationGuard'
import { importDocument } from '@/features/editor/services/document-import'
import { usePaginationStore } from '@/features/editor/stores'
import { versionsApi, isVersionEditable } from '@/features/templates'
import type { TemplateVersionDetail } from '@/features/templates/types'
import type { PortableDocument } from '@/features/editor/types/document-format'
import { Button } from '@/components/ui/button'
import type { Editor } from '@tiptap/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute(
  '/workspace/$workspaceId/editor/$templateId/version/$versionId'
)({
  component: EditorPage,
})

function EditorPage() {
  const { workspaceId: _workspaceId, templateId, versionId } = Route.useParams()
  const router = useRouter()
  const { t } = useTranslation()

  // Load variables (injectables) from the API
  const { variables } = useInjectables()

  // Editor ref for import/export
  const editorRef = useRef<Editor | null>(null)
  // Editor instance state for auto-save
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const contentLoadedRef = useRef(false)

  // Version data state
  const [version, setVersion] = useState<TemplateVersionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<Error | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Preparation overlay state - stays visible until editor is fully ready AND minimum time elapsed
  const [isPreparingDocument, setIsPreparingDocument] = useState(true)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const _overlayStartTimeRef = useRef(Date.now())

  // Track fetch to prevent StrictMode double-call
  const fetchStartedRef = useRef(false)
  const lastFetchedParamsRef = useRef<string | null>(null)

  // Fetch version details from backend
  const fetchVersion = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    setImportError(null)
    contentLoadedRef.current = false
    try {
      const data = await versionsApi.get(templateId, versionId)
      setVersion(data)
    } catch (error) {
      console.error('Failed to fetch version:', error)
      setFetchError(error instanceof Error ? error : new Error('Failed to load version'))
    } finally {
      setIsLoading(false)
    }
  }, [templateId, versionId])

  useEffect(() => {
    const paramsKey = `${templateId}:${versionId}`

    // Skip if already fetched for these params (prevents StrictMode double-call)
    if (fetchStartedRef.current && lastFetchedParamsRef.current === paramsKey) {
      return
    }

    fetchStartedRef.current = true
    lastFetchedParamsRef.current = paramsKey
    fetchVersion()
  }, [fetchVersion, templateId, versionId])

  // Check if version is editable
  const isEditable = isVersionEditable(version)

  // Load content into editor when both are ready
  useEffect(() => {
    if (!editorRef.current || !version || contentLoadedRef.current) return

    const editor = editorRef.current

    // If no content, leave editor empty (new document)
    const hasContent = version.contentStructure &&
      (Object.keys(version.contentStructure).length > 0)

    if (!hasContent) {
      contentLoadedRef.current = true
      return
    }

    // Create store actions adapter
    const storeActions = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic config type
      setPaginationConfig: (config: any) => {
        const { pageSize, margins } = config
        if (pageSize) usePaginationStore.getState().setPageSize(pageSize)
        if (margins) usePaginationStore.getState().setMargins(margins)
      },
    }

    // Import document using contentStructure
    // contentStructure is already a PortableDocument object, not a string
    const portableDoc = version.contentStructure as unknown as PortableDocument
    const result = importDocument(
      portableDoc,
      editor,
      storeActions,
      variables.map((v) => ({
        id: v.id,
        variableId: v.variableId,
        type: v.type,
        label: v.label,
      }))
    )

    if (!result.success) {
      const errorMessages = result.validation.errors
        .map((e) => e.message)
        .join(', ')
      setImportError(errorMessages || t('editor.errors.importFailed'))
      console.error('Import failed:', result.validation.errors)
      console.error('Import failed - Full errors:', JSON.stringify(result.validation.errors, null, 2))
      console.error('Import failed - Document:', JSON.stringify(portableDoc, null, 2))
    }

    contentLoadedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable, editorRef.current triggers on editor ready
  }, [version, editorRef.current, variables])

  // Auto-save hook
  const autoSave = useAutoSave({
    editor: editorInstance,
    templateId,
    versionId,
    enabled: isEditable && contentLoadedRef.current,
    debounceMs: 2000,
    meta: {
      title: version?.name || t('editor.document'),
      language: 'es',
    },
  })

  // Navigation guard - ensures changes are saved on exit
  useNavigationGuard({
    isDirty: autoSave.isDirty,
    status: autoSave.status,
    save: autoSave.save,
    enabled: isEditable,
  })

  // Force save handler (manual save button)
  const handleForceSave = useCallback(async () => {
    await autoSave.save()
  }, [autoSave])

  // Minimum display time for overlay (2 seconds)
  const MINIMUM_OVERLAY_TIME_MS = 2000

  // Start minimum time timer on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, MINIMUM_OVERLAY_TIME_MS)

    return () => clearTimeout(timer)
  }, [])

  // Hide overlay only when both conditions are met: editor ready AND minimum time elapsed
  useEffect(() => {
    if (isEditorReady && minTimeElapsed) {
      requestAnimationFrame(() => {
        setIsPreparingDocument(false)
      })
    }
  }, [isEditorReady, minTimeElapsed])

  // Handler for when editor is fully rendered with styles
  const handleEditorFullyReady = useCallback(() => {
    setIsEditorReady(true)
  }, [])

  // Error state (shows without overlay)
  if (fetchError || importError) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-sm text-destructive">
          {fetchError?.message || importError || t('editor.errors.versionLoadFailed')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            setImportError(null)
            fetchVersion()
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.retry') || 'Reintentar'}
        </Button>
      </div>
    )
  }

  // Show overlay while loading or preparing (but still render editor in background)
  const showPreparationOverlay = isLoading || isPreparingDocument

  return (
    <>
      {/* Preparation overlay - covers everything while loading */}
      <DocumentPreparationOverlay
        isVisible={showPreparationOverlay}
        documentName={version?.name}
      />

      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold">{version?.name || 'Editor'}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  v{version?.versionNumber || versionId}
                </span>
                {isEditable && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {t('editor.status.editable')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditable && (
              <>
                <SaveStatusIndicator
                  status={autoSave.status}
                  lastSavedAt={autoSave.lastSavedAt}
                  error={autoSave.error}
                  onRetry={handleForceSave}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceSave}
                  disabled={autoSave.status === 'saving'}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save') || 'Guardar'}
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Read-only banner - shows when document is published */}
        {!isEditable && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-warning-muted border-b border-warning-border">
            <Lock className="h-4 w-4 text-warning-foreground" />
            <span className="text-sm font-medium text-warning-foreground">
              {t('editor.status.readOnlyBanner')}
            </span>
          </div>
        )}

        {/* Editor - renders in background while overlay shows */}
        <div className="flex-1 overflow-hidden">
          {!isLoading && (
            <DocumentEditor
              key="editor"
              initialContent=""
              editable={isEditable}
              variables={variables}
              editorRef={editorRef}
              onEditorReady={setEditorInstance}
              onFullyReady={handleEditorFullyReady}
              templateId={templateId}
              versionId={versionId}
            />
          )}
        </div>
      </div>
    </>
  )
}
