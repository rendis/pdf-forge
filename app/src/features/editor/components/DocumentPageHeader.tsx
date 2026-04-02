import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Moveable from 'react-moveable'
import { useDroppable } from '@dnd-kit/core'
import { ImageIcon, PanelLeft, PanelRight, LayoutTemplate, Trash2 } from 'lucide-react'
import { Extension, type Editor, type JSONContent } from '@tiptap/core'
import { cn } from '@/lib/utils'
import { ImageInsertModal, type ImageInsertResult } from './ImageInsertModal'
import { useDocumentHeaderStore, type DocumentHeaderLayout } from '../stores/document-header-store'
import { StoredMarksPersistenceExtension } from '../extensions/StoredMarksPersistence'
import { LineSpacingExtension } from '../extensions/LineSpacing'
import { InjectorExtension } from '../extensions/Injector'
import { hasMeaningfulHeaderContent, normalizeHeaderContent } from '../utils/document-header'
import { IMAGE_VARIABLE_PLACEHOLDER_SRC } from '../utils/image-variable-placeholder'

export const HEADER_DROP_ZONE_ID = 'editor-header-drop-zone'

interface DocumentPageHeaderProps {
  editable: boolean
  active?: boolean
  onActivate?: () => void
  onTextEditorFocus?: (editor: Editor) => void
  onEditorReady?: (editor: Editor | null) => void
  openImageModalToken?: number
  paddingLeft?: number
  paddingRight?: number
}

interface ImageSlotProps {
  imageUrl: string | null
  imageAlt: string
  imageWidth: number | null
  preserveAspectRatio?: boolean
  editable: boolean
  active: boolean
  selected: boolean
  imageRef: RefObject<HTMLImageElement | null>
  onOpenModal: () => void
  onSelect: () => void
  onLoad: () => void
  onRemove: () => void
  className?: string
}

function ImageSlot({
  imageUrl,
  imageAlt,
  imageWidth,
  preserveAspectRatio = false,
  editable,
  active,
  selected,
  imageRef,
  onOpenModal,
  onSelect,
  onLoad,
  onRemove,
  className,
}: ImageSlotProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        imageUrl
          ? 'h-24 min-h-0 shrink-0 bg-transparent'
          : 'min-h-[88px] rounded-lg border border-dashed border-border/70 bg-background/40',
        active && editable && !imageUrl && 'border-primary/60 bg-primary/5',
        className
      )}
      style={imageUrl ? {
        width: imageWidth ? `${imageWidth}px` : undefined,
        height: `${HEADER_IMAGE_HEIGHT}px`,
      } : undefined}
    >
      {imageUrl ? (
        <>
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageAlt}
            className={cn(
              'block max-h-none transition-shadow',
              preserveAspectRatio ? 'object-contain' : 'object-fill',
              editable && 'cursor-pointer',
              selected && 'ring-2 ring-primary ring-offset-2'
            )}
            style={{
              width: '100%',
              height: `${HEADER_IMAGE_HEIGHT}px`,
              maxWidth: 'none',
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (editable) {
                onSelect()
              }
            }}
            onLoad={onLoad}
          />
          {editable && (
            <>
              {active && selected && (
                <button
                  type="button"
                  data-header-no-focus="true"
                  onClick={onOpenModal}
                  className="absolute left-2 top-2 z-10 rounded-full bg-background/90 p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  title={t('editor.documentHeader.editLogo')}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </button>
              )}
              {active && selected && (
                <button
                  type="button"
                  data-header-no-focus="true"
                  onClick={onRemove}
                  className="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  title={t('common.remove')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  )
}

const LAYOUTS: { value: DocumentHeaderLayout; icon: typeof PanelLeft; labelKey: string }[] = [
  { value: 'image-left', icon: PanelLeft, labelKey: 'editor.documentHeader.layoutImageLeft' },
  { value: 'image-center', icon: LayoutTemplate, labelKey: 'editor.documentHeader.layoutImageCenter' },
  { value: 'image-right', icon: PanelRight, labelKey: 'editor.documentHeader.layoutImageRight' },
]

const EMPTY_HEADER_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }
const HEADER_IMAGE_HEIGHT = 96
const HEADER_IMAGE_MIN_WIDTH = 32
const HEADER_IMAGE_GAP = 16
const HEADER_TEXT_MIN_WIDTH = 240
const HEADER_TEXT_HEIGHT = 96
const HEADER_OVERFLOW_TOLERANCE = 4
const HEADER_SURFACE_VERTICAL_PADDING = 12
const HEADER_SURFACE_MIN_HEIGHT = HEADER_TEXT_HEIGHT + HEADER_SURFACE_VERTICAL_PADDING * 2

const HeaderEnterAsBreakExtension = Extension.create({
  name: 'headerEnterAsBreak',
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.setHardBreak(),
    }
  },
})

function LayoutPicker({
  current,
  onChange,
}: {
  current: DocumentHeaderLayout
  onChange: (layout: DocumentHeaderLayout) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background/90 p-1 shadow-sm">
      {LAYOUTS.map(({ value, icon: Icon, labelKey }) => (
        <button
          key={value}
          type="button"
          data-header-no-focus="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange(value)}
          title={t(labelKey)}
          className={cn(
            'rounded-full p-1.5 transition-colors',
            current === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}

export function DocumentPageHeader({
  editable,
  active = false,
  onActivate,
  onTextEditorFocus,
  onEditorReady,
  openImageModalToken = 0,
  paddingLeft = 32,
  paddingRight = 32,
}: DocumentPageHeaderProps) {
  const { t } = useTranslation()
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
  } = useDocumentHeaderStore()

  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [isImageSelected, setIsImageSelected] = useState(false)
  const displayImageUrl = imageUrl || (imageInjectableId ? IMAGE_VARIABLE_PLACEHOLDER_SRC : null)
  const hasHeaderText = useMemo(
    () => hasMeaningfulHeaderContent(storeContent),
    [storeContent]
  )

  const { setNodeRef: setDropZoneRef, isOver } = useDroppable({ id: HEADER_DROP_ZONE_ID })

  const surfaceRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const textSlotRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const moveableRef = useRef<{ updateRect?: () => void } | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const lastExternalContent = useRef<string>(JSON.stringify(storeContent))
  const lastValidContent = useRef<JSONContent>(storeContent ?? EMPTY_HEADER_DOC)
  const isExternalUpdate = useRef(false)
  const lastInputTypeRef = useRef<string | null>(null)

  const resetHeaderScroll = (editor: Editor) => {
    const editorElement = editor.view.dom as HTMLElement | null
    if (editorElement) {
      editorElement.scrollTop = 0
    }
  }

  const isHeaderOverflowing = (editor: Editor) => {
    const editorElement = editor.view.dom as HTMLElement | null
    if (!editorElement) return false

    return editorElement.scrollHeight > editorElement.clientHeight + HEADER_OVERFLOW_TOLERANCE
  }

  const restoreLastValidHeaderContent = (editor: Editor) => {
    const normalized = normalizeHeaderContent(lastValidContent.current) ?? EMPTY_HEADER_DOC
    const serialized = JSON.stringify(normalized)
    lastExternalContent.current = serialized
    isExternalUpdate.current = true
    editor.commands.setContent(normalized)
    isExternalUpdate.current = false

    requestAnimationFrame(() => {
      resetHeaderScroll(editor)
      if (editor.isFocused) {
        editor.commands.focus('end')
      }
    })
  }

  const headerEditor = useEditor({
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
      HeaderEnterAsBreakExtension,
      InjectorExtension,
    ],
    content: storeContent ?? EMPTY_HEADER_DOC,
    editable,
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return
      const json = editor.getJSON()
      const lastInputType = lastInputTypeRef.current
      lastInputTypeRef.current = null

      if (isHeaderOverflowing(editor)) {
        const isDeletion = lastInputType?.startsWith('delete') ?? false
        const isHistoryAction = lastInputType === 'historyUndo' || lastInputType === 'historyRedo'

        if (!isDeletion && !isHistoryAction) {
          restoreLastValidHeaderContent(editor)
          return
        }
      }

      const normalized = normalizeHeaderContent(json) ?? EMPTY_HEADER_DOC
      lastValidContent.current = normalized
      lastExternalContent.current = JSON.stringify(normalized)
      setContent(normalized)
    },
    onFocus: ({ editor }) => {
      onActivate?.()
      setIsImageSelected(false)
      resetHeaderScroll(editor)
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
    onEditorReady?.(headerEditor ?? null)

    return () => {
      onEditorReady?.(null)
    }
  }, [headerEditor, onEditorReady])

  useEffect(() => {
    if (!headerEditor) return
    const serialized = JSON.stringify(storeContent)
    if (serialized === lastExternalContent.current) return

    lastValidContent.current = storeContent ?? EMPTY_HEADER_DOC
    lastExternalContent.current = serialized
    isExternalUpdate.current = true
    headerEditor.commands.setContent(storeContent ?? EMPTY_HEADER_DOC)
    isExternalUpdate.current = false
    requestAnimationFrame(() => {
      resetHeaderScroll(headerEditor)
    })
  }, [storeContent, headerEditor])

  useEffect(() => {
    if (!headerEditor) return
    headerEditor.setEditable(editable)
  }, [headerEditor, editable])

  const isLateralLayout = layout === 'image-left' || layout === 'image-right'
  const hasTextAndLateralImage = Boolean(displayImageUrl) && isLateralLayout && hasHeaderText

  const getRowWidth = useCallback(() => {
    const rowWidth = rowRef.current?.clientWidth
    if (rowWidth && rowWidth > 0) {
      return rowWidth
    }

    const surfaceWidth = surfaceRef.current?.clientWidth ?? 0
    return Math.max(surfaceWidth - paddingLeft - paddingRight, 0)
  }, [paddingLeft, paddingRight])

  const doesHeaderTextFitWidth = useCallback((textWidth: number) => {
    if (!hasTextAndLateralImage || !headerEditor) return true

    const textSlot = textSlotRef.current
    const editorElement = headerEditor.view.dom as HTMLElement | null
    if (!textSlot || !editorElement) return true

    const previousWidth = textSlot.style.width
    const previousMinWidth = textSlot.style.minWidth
    const previousMaxWidth = textSlot.style.maxWidth
    const previousFlex = textSlot.style.flex

    textSlot.style.width = `${textWidth}px`
    textSlot.style.minWidth = `${textWidth}px`
    textSlot.style.maxWidth = `${textWidth}px`
    textSlot.style.flex = '0 0 auto'

    const fits = editorElement.scrollHeight <= editorElement.clientHeight + HEADER_OVERFLOW_TOLERANCE

    textSlot.style.width = previousWidth
    textSlot.style.minWidth = previousMinWidth
    textSlot.style.maxWidth = previousMaxWidth
    textSlot.style.flex = previousFlex

    return fits
  }, [hasTextAndLateralImage, headerEditor])

  const getMaxImageWidth = useCallback((hasText = hasTextAndLateralImage) => {
    const availableWidth = getRowWidth()
    if (availableWidth <= 0) {
      return HEADER_IMAGE_MIN_WIDTH
    }

    const baseMaxWidth = hasText
      ? availableWidth - HEADER_IMAGE_GAP - HEADER_TEXT_MIN_WIDTH
      : availableWidth

    const clampedBaseMaxWidth = Math.max(HEADER_IMAGE_MIN_WIDTH, Math.floor(baseMaxWidth))

    if (!hasText) {
      return clampedBaseMaxWidth
    }

    let low = HEADER_IMAGE_MIN_WIDTH
    let high = clampedBaseMaxWidth
    let best = HEADER_IMAGE_MIN_WIDTH

    while (low <= high) {
      const candidate = Math.floor((low + high) / 2)
      const textWidth = availableWidth - HEADER_IMAGE_GAP - candidate

      if (textWidth < HEADER_TEXT_MIN_WIDTH) {
        high = candidate - 1
        continue
      }

      if (doesHeaderTextFitWidth(textWidth)) {
        best = candidate
        low = candidate + 1
      } else {
        high = candidate - 1
      }
    }

    return best
  }, [doesHeaderTextFitWidth, getRowWidth, hasTextAndLateralImage])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setImageElement(imageRef.current)
      moveableRef.current?.updateRect?.()
    })

    return () => cancelAnimationFrame(frame)
  }, [displayImageUrl, imageWidth, layout, isImageSelected])

  useEffect(() => {
    if (!displayImageUrl || !imageWidth) return

    const frame = requestAnimationFrame(() => {
      const maxWidth = getMaxImageWidth()
      if (imageWidth > maxWidth) {
        setImageDimensions(maxWidth, HEADER_IMAGE_HEIGHT)
        return
      }

      moveableRef.current?.updateRect?.()
    })

    return () => cancelAnimationFrame(frame)
  }, [displayImageUrl, getMaxImageWidth, imageWidth, layout, setImageDimensions])

  useEffect(() => {
    if (openImageModalToken > 0) {
      queueMicrotask(() => {
        setImageModalOpen(true)
      })
    }
  }, [openImageModalToken])

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
    const scaledWidth = naturalWidth * (HEADER_IMAGE_HEIGHT / naturalHeight)
    const nextWidth = Math.min(maxWidth, Math.max(HEADER_IMAGE_MIN_WIDTH, scaledWidth))

    setImageDimensions(Math.round(nextWidth), HEADER_IMAGE_HEIGHT)
  }

  const handleSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    handleSurfaceActivate()

    if (!editable || !headerEditor) return

    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('[data-header-no-focus="true"]')) {
      return
    }

    setIsImageSelected(false)
    headerEditor.chain().focus().run()
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

  const textSlot = headerEditor ? (
    <div
      ref={textSlotRef}
      className={cn(
        'relative flex-1 basis-0 overflow-hidden',
        hasTextAndLateralImage ? 'min-w-[240px]' : 'min-w-0'
      )}
      style={{ height: `${HEADER_TEXT_HEIGHT}px` }}
    >
      {!hasHeaderText && (
        <span className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground/80">
          {t('editor.documentHeader.textPlaceholder')}
        </span>
      )}
      <EditorContent editor={headerEditor} className="h-full min-w-0 overflow-hidden" />
    </div>
  ) : null

  const renderCenteredImageOnly = layout === 'image-center' && displayImageUrl
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
          editable && 'border-y border-dashed border-border/80 bg-background/70',
          editable && active && 'border-primary/60 bg-primary/5',
          isOver && editable && 'border-primary bg-primary/10',
        )}
        onMouseDownCapture={handleSurfaceActivate}
        onClick={handleSurfaceClick}
      >
        {editable && active && displayImageUrl && (
          <div className="absolute top-3 left-full ml-3 z-20">
            <LayoutPicker current={layout} onChange={setLayout} />
          </div>
        )}

        {layout === 'image-left' && (
          <div
            className="py-3"
            style={{ paddingLeft, paddingRight, minHeight: `${HEADER_SURFACE_MIN_HEIGHT}px` }}
          >
            {displayImageUrl ? (
              <div ref={rowRef} className="flex h-24 min-w-0 flex-nowrap items-stretch gap-4 overflow-hidden">
                <ImageSlot
                  imageUrl={displayImageUrl}
                  imageAlt={imageAlt || imageInjectableLabel || ''}
                  imageWidth={imageWidth}
                  preserveAspectRatio={Boolean(imageInjectableId)}
                  editable={editable}
                  active={active}
                  selected={imageSelected}
                  imageRef={imageRef}
                  onOpenModal={() => {
                    handleSurfaceActivate()
                    setImageModalOpen(true)
                  }}
                  onSelect={() => {
                    handleSurfaceActivate()
                    setIsImageSelected(true)
                  }}
                  onLoad={handleImageLoad}
                  onRemove={() => setImage('', '', null, null)}
                  className="shrink-0"
                />
                {textSlot}
              </div>
            ) : (
              textSlot
            )}
          </div>
        )}

        {layout === 'image-right' && (
          <div
            className="py-3"
            style={{ paddingLeft, paddingRight, minHeight: `${HEADER_SURFACE_MIN_HEIGHT}px` }}
          >
            {displayImageUrl ? (
              <div ref={rowRef} className="flex h-24 min-w-0 flex-nowrap items-stretch gap-4 overflow-hidden">
                {textSlot}
                <ImageSlot
                  imageUrl={displayImageUrl}
                  imageAlt={imageAlt || imageInjectableLabel || ''}
                  imageWidth={imageWidth}
                  preserveAspectRatio={Boolean(imageInjectableId)}
                  editable={editable}
                  active={active}
                  selected={imageSelected}
                  imageRef={imageRef}
                  onOpenModal={() => {
                    handleSurfaceActivate()
                    setImageModalOpen(true)
                  }}
                  onSelect={() => {
                    handleSurfaceActivate()
                    setIsImageSelected(true)
                  }}
                  onLoad={handleImageLoad}
                  onRemove={() => setImage('', '', null, null)}
                  className="shrink-0"
                />
              </div>
            ) : (
              textSlot
            )}
          </div>
        )}

        {layout === 'image-center' && (
          <div
            className={cn(
              'py-3',
              renderCenteredImageOnly ? 'flex h-24 items-center justify-center' : 'flex'
            )}
            style={{ paddingLeft, paddingRight, minHeight: `${HEADER_SURFACE_MIN_HEIGHT}px` }}
          >
            {renderCenteredImageOnly ? (
              <div ref={rowRef} className="flex h-24 w-full min-w-0 flex-nowrap items-center justify-center overflow-hidden">
                <ImageSlot
                imageUrl={displayImageUrl}
                imageAlt={imageAlt || imageInjectableLabel || ''}
                imageWidth={imageWidth}
                preserveAspectRatio={Boolean(imageInjectableId)}
                editable={editable}
                active={active}
                selected={imageSelected}
                imageRef={imageRef}
                onOpenModal={() => {
                  handleSurfaceActivate()
                  setImageModalOpen(true)
                }}
                onSelect={() => {
                  handleSurfaceActivate()
                  setIsImageSelected(true)
                }}
                onLoad={handleImageLoad}
                onRemove={() => setImage('', '', null, null)}
                className="shrink-0"
              />
              </div>
            ) : (
              textSlot
            )}
          </div>
        )}
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
            const clampedWidth = Math.max(HEADER_IMAGE_MIN_WIDTH, Math.min(width, maxWidth))
            target.style.width = '100%'
            target.style.height = `${HEADER_IMAGE_HEIGHT}px`

            const imageContainer = target.parentElement as HTMLElement | null
            if (imageContainer) {
              imageContainer.style.width = `${clampedWidth}px`
              imageContainer.style.height = `${HEADER_IMAGE_HEIGHT}px`
            }
          }}
          onResizeEnd={({ target }) => {
            const imageContainer = target.parentElement as HTMLElement | null
            const nextWidth = Math.round(parseFloat(imageContainer?.style.width ?? ''))
            if (!Number.isNaN(nextWidth)) {
              setImageDimensions(nextWidth, HEADER_IMAGE_HEIGHT)
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
