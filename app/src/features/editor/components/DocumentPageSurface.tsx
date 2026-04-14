import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Moveable from 'react-moveable'
import { useDroppable } from '@dnd-kit/core'
import { Extension, type Editor, type JSONContent } from '@tiptap/core'
import { cn } from '@/lib/utils'
import { ImageInsertModal, type ImageInsertResult } from './ImageInsertModal'
import {
  DocumentPageSurfaceLayout,
  SurfaceLayoutPicker,
} from './DocumentPageSurfaceLayout'
import type { SurfaceKind } from '../types/document-surface'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { useDocumentFooterStore } from '../stores/document-footer-store'
import { StoredMarksPersistenceExtension } from '../extensions/StoredMarksPersistence'
import { LineSpacingExtension } from '../extensions/LineSpacing'
import { InjectorExtension } from '../extensions/Injector'
import { hasMeaningfulSurfaceContent, normalizeSurfaceContent } from '../utils/document-surface'
import { IMAGE_VARIABLE_PLACEHOLDER_SRC } from '../utils/image-variable-placeholder'
import {
  SURFACE_IMAGE_GAP,
  SURFACE_IMAGE_HEIGHT,
  SURFACE_IMAGE_MIN_WIDTH,
  SURFACE_OVERFLOW_TOLERANCE,
  SURFACE_TEXT_HEIGHT,
  SURFACE_TEXT_MIN_WIDTH,
  calculateScaledSurfaceImageWidth,
  getSurfaceRowWidth,
  shouldRestoreSurfaceContent,
} from '../utils/document-surface-layout'

// ---------------------------------------------------------------------------
// Surface-specific config derived from `kind`
// ---------------------------------------------------------------------------

interface SurfaceConfig {
  dropZoneId: string
  noFocusAttr: string
  i18nPrefix: string
  extensionName: string
  useSurfaceStore: typeof useDocumentHeaderStore
}

const SURFACE_CONFIGS: Record<SurfaceKind, SurfaceConfig> = {
  header: {
    dropZoneId: 'editor-header-drop-zone',
    noFocusAttr: 'data-header-no-focus',
    i18nPrefix: 'editor.documentHeader',
    extensionName: 'headerEnterAsBreak',
    useSurfaceStore: useDocumentHeaderStore,
  },
  footer: {
    dropZoneId: 'editor-footer-drop-zone',
    noFocusAttr: 'data-footer-no-focus',
    i18nPrefix: 'editor.documentFooter',
    extensionName: 'footerEnterAsBreak',
    useSurfaceStore: useDocumentFooterStore,
  },
}

/** Stable drop-zone IDs — re-exported by thin wrappers for callers */
export const HEADER_DROP_ZONE_ID = SURFACE_CONFIGS.header.dropZoneId
export const FOOTER_DROP_ZONE_ID = SURFACE_CONFIGS.footer.dropZoneId

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DocumentPageSurfaceProps {
  kind: SurfaceKind
  editable: boolean
  active?: boolean
  onActivate?: () => void
  onTextEditorFocus?: (editor: Editor) => void
  onEditorReady?: (editor: Editor | null) => void
  openImageModalToken?: number
  paddingLeft?: number
  paddingRight?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY_SURFACE_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

function resetEditorScroll(editor: Editor) {
  const el = editor.view.dom as HTMLElement | null
  if (el) el.scrollTop = 0
}

function isEditorOverflowing(editor: Editor) {
  const el = editor.view.dom as HTMLElement | null
  if (!el) return false
  return el.scrollHeight > el.clientHeight + SURFACE_OVERFLOW_TOLERANCE
}

/**
 * Binary-search for the largest image width that still leaves enough room
 * for text to render without overflow.
 */
function findMaxImageWidth(
  availableWidth: number,
  clampedBaseMaxWidth: number,
  doesTextFit: (textWidth: number) => boolean,
): number {
  let low = SURFACE_IMAGE_MIN_WIDTH
  let high = clampedBaseMaxWidth
  let best = SURFACE_IMAGE_MIN_WIDTH

  while (low <= high) {
    const candidate = Math.floor((low + high) / 2)
    const textWidth = availableWidth - SURFACE_IMAGE_GAP - candidate

    if (textWidth < SURFACE_TEXT_MIN_WIDTH) {
      high = candidate - 1
      continue
    }

    if (doesTextFit(textWidth)) {
      best = candidate
      low = candidate + 1
    } else {
      high = candidate - 1
    }
  }

  return best
}

export function DocumentPageSurface({
  kind,
  editable,
  active = false,
  onActivate,
  onTextEditorFocus,
  onEditorReady,
  openImageModalToken = 0,
  paddingLeft = 32,
  paddingRight = 32,
}: DocumentPageSurfaceProps) {
  const { t } = useTranslation()
  const cfg = SURFACE_CONFIGS[kind]
  const onEditorReadyRef = useRef(onEditorReady)

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady
  }, [onEditorReady])

  const {
    layout,
    imageUrl,
    imageAlt,
    imageInjectableId,
    imageInjectableLabel,
    imageWidth,
    imageHeight,
    content: storeContent,
    setLayout,
    setImage,
    setImageDimensions,
    setContent,
  } = cfg.useSurfaceStore()

  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [isImageSelected, setIsImageSelected] = useState(false)
  const displayImageUrl = imageUrl || (imageInjectableId ? IMAGE_VARIABLE_PLACEHOLDER_SRC : null)
  const hasSurfaceText = useMemo(
    () => hasMeaningfulSurfaceContent(storeContent),
    [storeContent]
  )

  const { setNodeRef: setDropZoneRef, isOver } = useDroppable({ id: cfg.dropZoneId })

  // Create the enter-as-break extension once per mount (name is stable per kind)
  const enterAsBreakExt = useMemo(
    () =>
      Extension.create({
        name: cfg.extensionName,
        addKeyboardShortcuts() {
          return {
            Enter: () => this.editor.commands.setHardBreak(),
          }
        },
      }),
    [cfg.extensionName]
  )

  const surfaceRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const textSlotRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const moveableRef = useRef<{ updateRect?: () => void } | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const lastExternalContent = useRef<string>(JSON.stringify(storeContent))
  const lastValidContent = useRef<JSONContent>(storeContent ?? EMPTY_SURFACE_DOC)
  const isExternalUpdate = useRef(false)
  const lastInputTypeRef = useRef<string | null>(null)

  const restoreLastValidContent = (editor: Editor) => {
    const normalized = normalizeSurfaceContent(lastValidContent.current) ?? EMPTY_SURFACE_DOC
    const serialized = JSON.stringify(normalized)
    lastExternalContent.current = serialized
    isExternalUpdate.current = true
    editor.commands.setContent(normalized)
    isExternalUpdate.current = false

    requestAnimationFrame(() => {
      resetEditorScroll(editor)
      if (editor.isFocused) {
        editor.commands.focus('end')
      }
    })
  }

  const surfaceEditor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      Color,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      StoredMarksPersistenceExtension,
      LineSpacingExtension,
      enterAsBreakExt,
      InjectorExtension,
    ],
    content: storeContent ?? EMPTY_SURFACE_DOC,
    editable,
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return
      const json = editor.getJSON()
      const lastInputType = lastInputTypeRef.current
      lastInputTypeRef.current = null

      if (isEditorOverflowing(editor)) {
        if (shouldRestoreSurfaceContent(lastInputType)) {
          restoreLastValidContent(editor)
          return
        }
      }

      const normalized = normalizeSurfaceContent(json) ?? EMPTY_SURFACE_DOC
      lastValidContent.current = normalized
      lastExternalContent.current = JSON.stringify(normalized)
      setContent(normalized)
    },
    onFocus: ({ editor }) => {
      onActivate?.()
      setIsImageSelected(false)
      resetEditorScroll(editor)
      onTextEditorFocus?.(editor)
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          'prose-p:my-0 prose-headings:my-0 prose-ul:my-0 prose-ol:my-0',
          '-mt-[0.2em] h-[calc(100%+0.2em)] min-h-[calc(100%+0.2em)] whitespace-pre-wrap overflow-hidden',
          '!text-[10.5pt]'
        ),
      },
      handleDOMEvents: {
        beforeinput: (_view, event) => {
          lastInputTypeRef.current = event.inputType ?? null
          return false
        },
      },
    },
  })

  useEffect(() => {
    onEditorReadyRef.current?.(surfaceEditor ?? null)
    return () => {
      onEditorReadyRef.current?.(null)
    }
  }, [surfaceEditor])

  // Sync store → editor when content changes externally
  useEffect(() => {
    if (!surfaceEditor) return
    const serialized = JSON.stringify(storeContent)
    if (serialized === lastExternalContent.current) return

    lastValidContent.current = storeContent ?? EMPTY_SURFACE_DOC
    lastExternalContent.current = serialized
    isExternalUpdate.current = true
    surfaceEditor.commands.setContent(storeContent ?? EMPTY_SURFACE_DOC)
    isExternalUpdate.current = false
    requestAnimationFrame(() => { resetEditorScroll(surfaceEditor) })
  }, [storeContent, surfaceEditor])

  // Sync editable flag
  useEffect(() => {
    if (!surfaceEditor) return
    surfaceEditor.setEditable(editable)
  }, [surfaceEditor, editable])

  const isLateralLayout = layout === 'image-left' || layout === 'image-right'
  const hasTextAndLateralImage = Boolean(displayImageUrl) && isLateralLayout && hasSurfaceText

  const getRowWidth = useCallback(() => {
    return getSurfaceRowWidth({
      rowWidth: rowRef.current?.clientWidth,
      surfaceWidth: surfaceRef.current?.clientWidth,
      paddingLeft,
      paddingRight,
    })
  }, [paddingLeft, paddingRight])

  const doesTextFitWidth = useCallback((textWidth: number) => {
    if (!hasTextAndLateralImage || !surfaceEditor) return true

    const textSlot = textSlotRef.current
    const editorElement = surfaceEditor.view.dom as HTMLElement | null
    if (!textSlot || !editorElement) return true

    const prev = {
      width: textSlot.style.width,
      minWidth: textSlot.style.minWidth,
      maxWidth: textSlot.style.maxWidth,
      flex: textSlot.style.flex,
    }

    textSlot.style.width = `${textWidth}px`
    textSlot.style.minWidth = `${textWidth}px`
    textSlot.style.maxWidth = `${textWidth}px`
    textSlot.style.flex = '0 0 auto'

    const fits = editorElement.scrollHeight <= editorElement.clientHeight + SURFACE_OVERFLOW_TOLERANCE

    textSlot.style.width = prev.width
    textSlot.style.minWidth = prev.minWidth
    textSlot.style.maxWidth = prev.maxWidth
    textSlot.style.flex = prev.flex

    return fits
  }, [hasTextAndLateralImage, surfaceEditor])

  const getMaxImageWidth = useCallback((hasText = hasTextAndLateralImage) => {
    const availableWidth = getRowWidth()
    if (availableWidth <= 0) {
      return SURFACE_IMAGE_MIN_WIDTH
    }

    const baseMaxWidth = hasText
      ? availableWidth - SURFACE_IMAGE_GAP - SURFACE_TEXT_MIN_WIDTH
      : availableWidth

    const clampedBaseMaxWidth = Math.max(SURFACE_IMAGE_MIN_WIDTH, Math.floor(baseMaxWidth))

    if (!hasText) {
      return clampedBaseMaxWidth
    }

    return findMaxImageWidth(availableWidth, clampedBaseMaxWidth, doesTextFitWidth)
  }, [doesTextFitWidth, getRowWidth, hasTextAndLateralImage])

  // Keep Moveable in sync with image element
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setImageElement(imageRef.current)
      moveableRef.current?.updateRect?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [displayImageUrl, imageWidth, layout, isImageSelected])

  // Clamp image width when max shrinks
  useEffect(() => {
    if (!displayImageUrl || !imageWidth) return

    const frame = requestAnimationFrame(() => {
      const maxWidth = getMaxImageWidth()
      if (imageWidth > maxWidth) {
        setImageDimensions(maxWidth, SURFACE_IMAGE_HEIGHT)
        return
      }
      moveableRef.current?.updateRect?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [displayImageUrl, getMaxImageWidth, imageWidth, layout, setImageDimensions])

  // Open image modal via token
  useEffect(() => {
    if (openImageModalToken > 0) {
      queueMicrotask(() => { setImageModalOpen(true) })
    }
  }, [openImageModalToken])

  // ---- Handlers ----

  const handleSurfaceActivate = () => {
    if (!editable) return
    onActivate?.()
  }

  const handleImageLoad = () => {
    if (!imageRef.current) return
    if (imageWidth && imageHeight) return

    const { naturalWidth, naturalHeight } = imageRef.current
    if (!naturalWidth || !naturalHeight) return

    const maxWidth = getMaxImageWidth()
    setImageDimensions(
      calculateScaledSurfaceImageWidth(naturalWidth, naturalHeight, maxWidth),
      SURFACE_IMAGE_HEIGHT
    )
  }

  const handleSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    handleSurfaceActivate()
    if (!editable || !surfaceEditor) return

    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(`[${cfg.noFocusAttr}="true"]`)) return

    setIsImageSelected(false)
    surfaceEditor.chain().focus().run()
  }

  const handleImageInsert = (result: ImageInsertResult) => {
    setImage(
      result.src,
      result.alt ?? result.injectableLabel ?? '',
      result.injectableId ?? null,
      result.injectableLabel ?? null,
    )
    setIsImageSelected(true)
    setImageModalOpen(false)
  }

  // ---- Render ----

  const textSlot = surfaceEditor ? (
    <div
      ref={textSlotRef}
      className={cn(
        'relative flex-1 basis-0 overflow-hidden',
        hasTextAndLateralImage ? 'min-w-[240px]' : 'min-w-0'
      )}
      style={{ height: `${SURFACE_TEXT_HEIGHT}px` }}
    >
      {!hasSurfaceText && (
        <span className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground/80">
          {t(`${cfg.i18nPrefix}.textPlaceholder`)}
        </span>
      )}
      <EditorContent editor={surfaceEditor} className="h-full min-w-0 overflow-hidden" />
    </div>
  ) : null

  const imageSelected = isImageSelected && Boolean(displayImageUrl)

  return (
    <>
      <div
        ref={(el) => {
          surfaceRef.current = el
          setDropZoneRef(el)
        }}
        className={cn(
          'relative w-full transition-colors',
          kind === 'footer' && 'mt-auto',
          editable && 'border-y border-dashed border-border/80 bg-background/70',
          editable && active && 'border-primary/60 bg-primary/5',
          isOver && editable && 'border-primary bg-primary/10',
        )}
        onMouseDownCapture={handleSurfaceActivate}
        onClick={handleSurfaceClick}
      >
        {editable && active && displayImageUrl && (
          <div className="absolute top-3 left-full ml-3 z-20">
            <SurfaceLayoutPicker kind={kind} current={layout} onChange={setLayout} />
          </div>
        )}
        <DocumentPageSurfaceLayout
          kind={kind}
          active={active}
          displayImageUrl={displayImageUrl}
          editable={editable}
          imageAlt={imageAlt}
          imageInjectableId={imageInjectableId}
          imageInjectableLabel={imageInjectableLabel}
          imageRef={imageRef}
          imageSelected={imageSelected}
          imageWidth={imageWidth}
          layout={layout}
          paddingLeft={paddingLeft}
          paddingRight={paddingRight}
          rowRef={rowRef}
          textSlot={textSlot}
          onImageLoad={handleImageLoad}
          onOpenImageModal={() => {
            handleSurfaceActivate()
            setImageModalOpen(true)
          }}
          onRemoveImage={() => setImage('', '', null, null)}
          onSelectImage={() => {
            handleSurfaceActivate()
            setIsImageSelected(true)
          }}
        />
      </div>

      {editable && active && imageSelected && imageElement && (
        <Moveable
          key={`${layout}-${displayImageUrl ?? 'none'}-${imageWidth ?? 'auto'}-${imageSelected ? 'selected' : 'idle'}`}
          ref={moveableRef as never}
          target={imageElement}
          resizable
          keepRatio={false}
          throttleResize={0}
          renderDirections={['e', 'w']}
          onResize={({ target, width }) => {
            const maxWidth = getMaxImageWidth()
            const clampedWidth = Math.max(SURFACE_IMAGE_MIN_WIDTH, Math.min(width, maxWidth))
            target.style.width = '100%'
            target.style.height = `${SURFACE_IMAGE_HEIGHT}px`

            const imageContainer = target.parentElement as HTMLElement | null
            if (imageContainer) {
              imageContainer.style.width = `${clampedWidth}px`
              imageContainer.style.height = `${SURFACE_IMAGE_HEIGHT}px`
            }
          }}
          onResizeEnd={({ target }) => {
            const imageContainer = target.parentElement as HTMLElement | null
            const nextWidth = Math.round(parseFloat(imageContainer?.style.width ?? ''))
            if (!Number.isNaN(nextWidth)) {
              setImageDimensions(nextWidth, SURFACE_IMAGE_HEIGHT)
            }
          }}
        />
      )}

      <ImageInsertModal
        open={imageModalOpen}
        onOpenChange={setImageModalOpen}
        onInsert={handleImageInsert}
        initialShape="square"
        initialImage={displayImageUrl ? {
          src: displayImageUrl,
          isBase64: displayImageUrl.startsWith('data:'),
          shape: 'square',
          alt: imageAlt || undefined,
          injectableId: imageInjectableId ?? undefined,
          injectableLabel: imageInjectableLabel ?? undefined,
        } : undefined}
      />
    </>
  )
}
