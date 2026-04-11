import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { HEADING_LEVELS } from '../config'
import { EditorToolbar } from './EditorToolbar'
import { PreviewButton } from './preview/PreviewButton'
import { PageSettings } from './PageSettings'
import { InjectorExtension } from '../extensions/Injector'
import { ConditionalExtension } from '../extensions/Conditional'
import { MentionExtension } from '../extensions/Mentions'
import { ImageExtension, type ImageShape } from '../extensions/Image'
import { PageBreakHR } from '../extensions/PageBreak'
import { SlashCommandsExtension, slashCommandsSuggestion } from '../extensions/SlashCommands'
import {
  TableExtension,
  TableRowExtension,
  TableHeaderExtension,
  TableCellExtension,
} from '../extensions/Table'
import { TableInjectorExtension } from '../extensions/TableInjector'
import { ListInjectorExtension } from '../extensions/ListInjector'
import { StoredMarksPersistenceExtension } from '../extensions/StoredMarksPersistence'
import { LineSpacingExtension } from '../extensions/LineSpacing'
import { ImageInsertModal, type ImageInsertResult } from './ImageInsertModal'
import { VariableFormatDialog } from './VariableFormatDialog'
import { VariablesPanel } from './VariablesPanel'
import { VariableDragOverlay } from './VariableDragOverlay'
import { InconsistencyNavigator } from './InconsistencyNavigator'
import { TableBubbleMenu } from './TableBubbleMenu'
import { TableCornerHandle } from './TableCornerHandle'
import { DocumentPageHeader, HEADER_DROP_ZONE_ID } from './DocumentPageHeader'
import { DocumentPageFooter, FOOTER_DROP_ZONE_ID } from './DocumentPageFooter'
import { cn } from '@/lib/utils'
import { type Variable } from '../types'
import type { SurfaceKind } from '../types/document-surface'
import { useDocumentHeaderStore, useDocumentFooterStore, usePaginationStore } from '../stores'
import type { Editor } from '@tiptap/core'
import { useVariableInsertion } from '../hooks/useVariableInsertion'
import { resolveActiveSurface, type ActiveSurface } from '../services/variable-insertion'

interface DocumentEditorProps {
  initialContent?: string
  onContentChange?: (content: string) => void
  editable?: boolean
  variables?: Variable[]
  onExport?: () => void
  onImport?: () => void
  editorRef?: React.RefObject<Editor | null>
  onEditorReady?: (editor: Editor | null) => void
  /** Called when editor is fully rendered and styles are applied */
  onFullyReady?: () => void
  /** Template ID for preview functionality */
  templateId?: string
  /** Version ID for preview functionality */
  versionId?: string
  onBeforePreview?: () => Promise<void>
}

export function DocumentEditor({
  initialContent = '<p>Comienza a escribir...</p>',
  onContentChange,
  editable = true,
  variables: _variables = [],
  onExport,
  onImport,
  editorRef,
  onEditorReady,
  onFullyReady,
  templateId,
  versionId,
  onBeforePreview,
}: DocumentEditorProps) {
  const { t } = useTranslation()

  // Get page config from store (for visual width and margins)
  const { pageSize, margins } = usePaginationStore()
  const headerHasMeaningfulContent = useDocumentHeaderStore((s) => s.enabled)
  const footerHasMeaningfulContent = useDocumentFooterStore((s) => s.enabled)

  // Store current content for editor recreation
  const [latestContent, setLatestContent] = useState(initialContent)

  // Key for editor recreation - only recreate when page width changes
  const editorKey = useMemo(
    () => `editor-${pageSize.width}`,
    [pageSize.width]
  )

  // Snapshot content when editorKey changes
  const [editorContent, setEditorContent] = useState(initialContent)
  const [prevEditorKey, setPrevEditorKey] = useState(editorKey)
  if (editorKey !== prevEditorKey) {
    setPrevEditorKey(editorKey)
    setEditorContent(latestContent)
  }

  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [isEditingImage, setIsEditingImage] = useState(false)
  const [pendingImagePosition, setPendingImagePosition] = useState<number | null>(null)
  const [editingImageShape, setEditingImageShape] = useState<ImageShape>('square')
  const [editingImageData, setEditingImageData] = useState<ImageInsertResult | null>(null)
  const [activeSurface, setActiveSurface] = useState<ActiveSurface>('body')
  const [surfaceEditors, setSurfaceEditors] = useState<Record<SurfaceKind, Editor | null>>({
    header: null,
    footer: null,
  })
  const [imageModalTokens, setImageModalTokens] = useState<Record<SurfaceKind, number>>({
    header: 0,
    footer: 0,
  })

  // DnD sensors - require 8px movement before drag starts (allows clicks to pass)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // When header is present, the header surface occupies the top margin area.
  // The body starts with a small fixed gap (matching Typst's #v(0.5em) ≈ 7px).
  const bodyTopPadding = useMemo(
    () => (headerHasMeaningfulContent ? 8 : margins.top),
    [headerHasMeaningfulContent, margins.top]
  )

  // When footer is present, the footer surface occupies the bottom margin area.
  const bodyBottomPadding = useMemo(
    () => (footerHasMeaningfulContent ? 8 : 0),
    [footerHasMeaningfulContent]
  )

  // When footer is present, remove the page container's bottom padding
  // because the footer occupies that margin area.
  const pageBottomPadding = useMemo(
    () => (footerHasMeaningfulContent ? 0 : margins.bottom),
    [footerHasMeaningfulContent, margins.bottom]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [...HEADING_LEVELS],
        },
      }),
      TextStyle,
      Color,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize.configure({ types: ['textStyle'] }),
      StoredMarksPersistenceExtension,
      LineSpacingExtension,
      TextAlign.configure({ types: ['heading', 'paragraph', 'tableCell', 'tableHeader'] }),
      InjectorExtension,
      MentionExtension,
      ConditionalExtension,
      ImageExtension,
      PageBreakHR,
      SlashCommandsExtension.configure({
        suggestion: slashCommandsSuggestion,
      }),
      TableExtension.configure({ resizable: true, lastColumnResizable: false }),
      TableRowExtension,
      TableHeaderExtension,
      TableCellExtension,
      TableInjectorExtension,
      ListInjectorExtension,
    ],
    // Use stored content on recreation, initial content on first render
    content: editorContent,
    editable,
    onUpdate: ({ editor }) => {
      // Store current content for potential editor recreation
      const html = editor.getHTML()
      setLatestContent(html)
      onContentChange?.(html)
    },
    onFocus: () => {
      setActiveSurface('body')
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] prose-p:my-0 prose-headings:my-0 prose-ul:my-0 prose-ol:my-0',
      },
    },
  }, [editorKey]) // Recreate editor when editorKey changes

  // Store editor reference for export/import
  useEffect(() => {
    if (editor && editorRef) {
      editorRef.current = editor
    }
    // Notify parent when editor is ready
    onEditorReady?.(editor ?? null)
  }, [editor, editorRef, onEditorReady])

  // Notify when editor is fully rendered and styles are applied
  useEffect(() => {
    if (!editor || !onFullyReady) return

    // Wait for next frame to ensure styles are painted
    const rafId = requestAnimationFrame(() => {
      // Additional small delay to ensure all CSS transitions complete
      const timerId = setTimeout(() => {
        onFullyReady()
      }, 50)

      return () => clearTimeout(timerId)
    })

    return () => cancelAnimationFrame(rafId)
  }, [editor, onFullyReady])

  const showHeaderSurface = editable || headerHasMeaningfulContent
  const showFooterSurface = editable || footerHasMeaningfulContent
  const resolvedActiveSurface = resolveActiveSurface(showHeaderSurface, activeSurface, showFooterSurface)
  const toolbarEditor = resolvedActiveSurface === 'body'
    ? editor
    : (surfaceEditors[resolvedActiveSurface] ?? editor)

  const {
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
  } = useVariableInsertion({
    bodyEditor: editor,
    headerEditor: surfaceEditors.header,
    footerEditor: surfaceEditors.footer,
    activeSurface: resolvedActiveSurface,
    headerDropZoneId: HEADER_DROP_ZONE_ID,
    footerDropZoneId: FOOTER_DROP_ZONE_ID,
  })

  // Listen for image modal events
  useEffect(() => {
    if (!editor) return

    const handleOpenImageModal = () => {
      setPendingImagePosition(editor.state.selection.from)
      setIsEditingImage(false)
      setImageModalOpen(true)
    }

    const handleEditImage = (event: CustomEvent<{
      src: string
      shape: ImageShape
      injectableId?: string
      injectableLabel?: string
    }>) => {
      const { src, shape, injectableId, injectableLabel } = event.detail
      setEditingImageShape(shape || 'square')
      setEditingImageData({
        src,
        isBase64: false,
        shape,
        injectableId,
        injectableLabel,
      })
      setIsEditingImage(true)
      setImageModalOpen(true)
    }

    const handleSelectVariableFormat = (
      event: CustomEvent<{
        variable: Variable
        range: { from: number; to: number }
      }>
    ) => {
      const { variable, range } = event.detail

      // Delete the @mention text
      editor.chain().focus().deleteRange(range).run()

      openPendingVariableDialog(
        {
          id: variable.id,
          itemType: 'variable',
          variableId: variable.variableId,
          label: variable.label,
          injectorType: variable.type,
          formatConfig: variable.formatConfig,
          sourceType: variable.sourceType,
          description: variable.description,
        },
        editor.state.selection.from,
        editor
      )
    }

    const dom = editor.view.dom
    dom.addEventListener('editor:open-image-modal', handleOpenImageModal)
    dom.addEventListener('editor:edit-image', handleEditImage as EventListener)
    dom.addEventListener(
      'editor:select-variable-format',
      handleSelectVariableFormat as EventListener
    )

    return () => {
      dom.removeEventListener('editor:open-image-modal', handleOpenImageModal)
      dom.removeEventListener('editor:edit-image', handleEditImage as EventListener)
      dom.removeEventListener(
        'editor:select-variable-format',
        handleSelectVariableFormat as EventListener
      )
    }
  }, [editor, openPendingVariableDialog])

  const handleSurfaceEditorFocus = useCallback((kind: SurfaceKind, surfaceEditor: Editor) => {
    setSurfaceEditors((prev) => ({ ...prev, [kind]: surfaceEditor }))
    setActiveSurface(kind)
  }, [])

  const handleSurfaceEditorReady = useCallback((kind: SurfaceKind, surfaceEditor: Editor | null) => {
    setSurfaceEditors((prev) => ({ ...prev, [kind]: surfaceEditor }))
  }, [])

  const handleActivateSurface = useCallback((kind: SurfaceKind) => {
    if (!editable) return
    setActiveSurface(kind)
  }, [editable])

  const handleActivateBody = useCallback(() => {
    if (!editable) return
    setActiveSurface('body')
  }, [editable])

  const handleOpenBodyImageModal = useCallback(() => {
    if (!editor) return

    setActiveSurface('body')
    setPendingImagePosition(editor.state.selection.from)
    setIsEditingImage(false)
    setImageModalOpen(true)
  }, [editor])

  const handleOpenSurfaceImageModal = useCallback((kind: SurfaceKind) => {
    if (!editable) return
    setActiveSurface(kind)
    setImageModalTokens((prev) => ({ ...prev, [kind]: prev[kind] + 1 }))
  }, [editable])

  const handleImageInsert = useCallback((result: ImageInsertResult) => {
    if (!editor) return

    const { src, shape, injectableId, injectableLabel } = result

    if (isEditingImage) {
      // Update existing image
      editor.chain().focus().updateAttributes('customImage', {
        src,
        shape,
        injectableId: injectableId || null,
        injectableLabel: injectableLabel || null,
      }).run()
    } else {
      // Insert new image
      if (pendingImagePosition !== null) {
        editor.chain().focus().setTextSelection(pendingImagePosition).run()
      }
      editor.chain().focus().setImage({
        src,
        shape,
        injectableId,
        injectableLabel,
      }).run()
    }

    setImageModalOpen(false)
    setIsEditingImage(false)
    setPendingImagePosition(null)
    setEditingImageData(null)
  }, [editor, isEditingImage, pendingImagePosition])

  const handleImageModalClose = useCallback((open: boolean) => {
    if (!open) {
      setImageModalOpen(false)
      setIsEditingImage(false)
      setPendingImagePosition(null)
      setEditingImageData(null)
    }
  }, [])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className={cn(
          'grid grid-rows-[auto_1fr] h-full',
          editable ? 'grid-cols-[auto_1fr]' : 'grid-cols-1'
        )}>
          {/* Left: Variables Panel - only show when editable */}
          {editable && (
            <VariablesPanel
              onVariableClick={handleVariableClick}
              draggingIds={activeDragData ? [activeDragData.id] : []}
              className="row-span-2 grid grid-rows-subgrid"
            />
          )}

          {/* Center: Main Editor Area */}
          <div className="row-span-2 grid grid-rows-subgrid min-w-0">
            {/* Header with Toolbar and Settings - Toolbar only when editable */}
            <div className="flex items-center justify-between border-b border-border bg-card min-w-0">
              {editable ? (
                <EditorToolbar
                  editor={toolbarEditor ?? editor}
                  documentEditor={editor}
                  activeSurface={resolvedActiveSurface}
                  onOpenImage={
                    resolvedActiveSurface === 'body'
                      ? handleOpenBodyImageModal
                      : () => handleOpenSurfaceImageModal(resolvedActiveSurface as SurfaceKind)
                  }
                  onExport={onExport}
                  onImport={onImport}
                  onBeforePreview={onBeforePreview}
                  templateId={templateId}
                  versionId={versionId}
                />
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex items-center gap-1 pr-2 shrink-0">
                {!editable && onExport && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExport}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor.toolbar.exportDocument')}</TooltipContent>
                  </Tooltip>
                )}
                {!editable && templateId && versionId && (
                  <PreviewButton
                    templateId={templateId}
                    versionId={versionId}
                    editor={editor}
                    beforeGenerate={onBeforePreview}
                  />
                )}
                <PageSettings disabled={!editable} />
              </div>
            </div>

            {/* Editor Content */}
            <div className="overflow-auto bg-background p-8 relative min-h-0">
              {/* Inconsistency Navigator - floating top-right */}
              {editable && (
                <div className="sticky top-0 z-40 flex justify-end mb-2 pointer-events-none">
                  <div className="pointer-events-auto">
                    <InconsistencyNavigator editor={editor} />
                  </div>
                </div>
              )}

              <div
                className="mx-auto bg-muted shadow-lg flex flex-col"
                style={{
                  width: pageSize.width,
                  minHeight: pageSize.height,
                  paddingBottom: pageBottomPadding,
                }}
              >
                {showHeaderSurface && (
                  <DocumentPageHeader
                    editable={editable}
                    active={resolvedActiveSurface === 'header'}
                    onActivate={() => handleActivateSurface('header')}
                    onTextEditorFocus={(e) => handleSurfaceEditorFocus('header', e)}
                    onEditorReady={(e) => handleSurfaceEditorReady('header', e)}
                    openImageModalToken={imageModalTokens.header}
                    paddingLeft={margins.left}
                    paddingRight={margins.right}
                  />
                )}
                <div
                  className="flex-1"
                  onMouseDownCapture={handleActivateBody}
                  style={{
                    paddingTop: bodyTopPadding,
                    paddingBottom: bodyBottomPadding,
                    paddingLeft: margins.left,
                    paddingRight: margins.right,
                  }}
                >
                <EditorContent editor={editor} />
                {editable && <TableBubbleMenu editor={editor} />}
                </div>
                {showFooterSurface && (
                  <DocumentPageFooter
                    editable={editable}
                    active={resolvedActiveSurface === 'footer'}
                    onActivate={() => handleActivateSurface('footer')}
                    onTextEditorFocus={(e) => handleSurfaceEditorFocus('footer', e)}
                    onEditorReady={(e) => handleSurfaceEditorReady('footer', e)}
                    openImageModalToken={imageModalTokens.footer}
                    paddingLeft={margins.left}
                    paddingRight={margins.right}
                  />
                )}
              </div>
              {/* Table corner handle - positioned relative to scroll container */}
              {editable && <TableCornerHandle editor={editor} />}
            </div>
          </div>

        </div>

        {/* Drag Overlay - shows ghost image while dragging */}
        <DragOverlay zIndex={100} dropAnimation={null}>
          {activeDragData ? <VariableDragOverlay data={activeDragData} /> : null}
        </DragOverlay>

        {/* Drop Cursor Visual Indicator */}
        {dropCursorPos && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              top: dropCursorPos.top,
              left: dropCursorPos.left - 2,
              height: dropCursorPos.height,
            }}
          >
            <div className="h-full w-[4px] bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <div className="absolute -top-1.5 -left-1 w-3 h-3 bg-blue-500 rounded-full shadow-sm ring-2 ring-background" />
          </div>
        )}
      </DndContext>
      <ImageInsertModal
        open={imageModalOpen}
        onOpenChange={handleImageModalClose}
        onInsert={handleImageInsert}
        initialShape={isEditingImage ? editingImageShape : 'square'}
        initialImage={isEditingImage ? editingImageData ?? undefined : undefined}
      />

      {pendingVariable && (
        <VariableFormatDialog
          variable={pendingVariable.variable}
          open={formatDialogOpen}
          onOpenChange={setFormatDialogOpen}
          onSelect={handleFormatSelect}
          onCancel={handleFormatCancel}
        />
      )}
    </>
  )
}
