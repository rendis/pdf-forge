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
  DocumentPageHeaderLayout,
  HeaderLayoutPicker,
} from './DocumentPageHeaderLayout'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { StoredMarksPersistenceExtension } from '../extensions/StoredMarksPersistence'
import { LineSpacingExtension } from '../extensions/LineSpacing'
import { InjectorExtension } from '../extensions/Injector'
import { hasMeaningfulHeaderContent, normalizeHeaderContent } from '../utils/document-header'
import { IMAGE_VARIABLE_PLACEHOLDER_SRC } from '../utils/image-variable-placeholder'
import {
  HEADER_IMAGE_GAP,
  HEADER_IMAGE_HEIGHT,
  HEADER_IMAGE_MIN_WIDTH,
  HEADER_OVERFLOW_TOLERANCE,
  HEADER_TEXT_HEIGHT,
  HEADER_TEXT_MIN_WIDTH,
  calculateScaledHeaderImageWidth,
  getHeaderRowWidth,
  shouldRestoreHeaderContent,
} from '../utils/document-header-layout'

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

const EMPTY_HEADER_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

const HeaderEnterAsBreakExtension = Extension.create({
  name: 'headerEnterAsBreak',
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.setHardBreak(),
    }
  },
})

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
        if (shouldRestoreHeaderContent(lastInputType)) {
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
    return getHeaderRowWidth({
      rowWidth: rowRef.current?.clientWidth,
      surfaceWidth: surfaceRef.current?.clientWidth,
      paddingLeft,
      paddingRight,
    })
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
    setImageDimensions(
      calculateScaledHeaderImageWidth(naturalWidth, naturalHeight, maxWidth),
      HEADER_IMAGE_HEIGHT
    )
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
            <HeaderLayoutPicker current={layout} onChange={setLayout} />
          </div>
        )}
        <DocumentPageHeaderLayout
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
