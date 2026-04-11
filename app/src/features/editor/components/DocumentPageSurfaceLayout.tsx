import { ImageIcon, LayoutTemplate, PanelLeft, PanelRight, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReactNode, RefObject } from 'react'
import { cn } from '@/lib/utils'
import type { SurfaceKind, DocumentSurfaceLayout } from '../types/document-surface'
import {
  SURFACE_IMAGE_HEIGHT,
  SURFACE_MIN_HEIGHT,
} from '../utils/document-surface-layout'

// ---------------------------------------------------------------------------
// Surface-specific config derived from `kind`
// ---------------------------------------------------------------------------

/** Derives the no-focus data attribute from surface kind. */
function noFocusAttr(kind: SurfaceKind): string {
  return `data-${kind}-no-focus`
}

/** Derives the i18n key prefix from surface kind. */
function i18nPrefix(kind: SurfaceKind): string {
  return kind === 'header' ? 'editor.documentHeader' : 'editor.documentFooter'
}

// ---------------------------------------------------------------------------
// ImageSlot (shared, internal)
// ---------------------------------------------------------------------------

export interface ImageSlotProps {
  kind: SurfaceKind
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
  kind,
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
  const nfProps = { [noFocusAttr(kind)]: 'true' } as Record<string, string>

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
      style={imageUrl ? { width: imageWidth ? `${imageWidth}px` : undefined, height: `${SURFACE_IMAGE_HEIGHT}px` } : undefined}
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
              height: `${SURFACE_IMAGE_HEIGHT}px`,
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
          {editable && active && selected && (
            <>
              <button
                type="button"
                {...nfProps}
                onClick={onOpenModal}
                className="absolute left-2 top-2 z-10 rounded-full bg-background/90 p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                title={t(`${i18nPrefix(kind)}.editLogo`)}
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                {...nfProps}
                onClick={onRemove}
                className="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                title={t('common.remove')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SurfaceLayoutPicker
// ---------------------------------------------------------------------------

const LAYOUT_OPTIONS: { value: DocumentSurfaceLayout; icon: typeof PanelLeft; keySuffix: string }[] = [
  { value: 'image-left', icon: PanelLeft, keySuffix: 'layoutImageLeft' },
  { value: 'image-center', icon: LayoutTemplate, keySuffix: 'layoutImageCenter' },
  { value: 'image-right', icon: PanelRight, keySuffix: 'layoutImageRight' },
]

export function SurfaceLayoutPicker({
  kind,
  current,
  onChange,
}: {
  kind: SurfaceKind
  current: DocumentSurfaceLayout
  onChange: (layout: DocumentSurfaceLayout) => void
}) {
  const { t } = useTranslation()
  const prefix = i18nPrefix(kind)
  const nfProps = { [noFocusAttr(kind)]: 'true' } as Record<string, string>

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background/90 p-1 shadow-sm">
      {LAYOUT_OPTIONS.map(({ value, icon: Icon, keySuffix }) => (
        <button
          key={value}
          type="button"
          {...nfProps}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange(value)}
          title={t(`${prefix}.${keySuffix}`)}
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

// ---------------------------------------------------------------------------
// DocumentPageSurfaceLayout
// ---------------------------------------------------------------------------

export interface DocumentPageSurfaceLayoutProps {
  kind: SurfaceKind
  active: boolean
  displayImageUrl: string | null
  editable: boolean
  imageAlt: string
  imageInjectableId: string | null
  imageInjectableLabel: string | null
  imageRef: RefObject<HTMLImageElement | null>
  imageSelected: boolean
  imageWidth: number | null
  layout: DocumentSurfaceLayout
  paddingLeft: number
  paddingRight: number
  rowRef: RefObject<HTMLDivElement | null>
  textSlot: ReactNode
  onImageLoad: () => void
  onOpenImageModal: () => void
  onRemoveImage: () => void
  onSelectImage: () => void
}

export function DocumentPageSurfaceLayout({
  kind,
  active,
  displayImageUrl,
  editable,
  imageAlt,
  imageInjectableId,
  imageInjectableLabel,
  imageRef,
  imageSelected,
  imageWidth,
  layout,
  paddingLeft,
  paddingRight,
  rowRef,
  textSlot,
  onImageLoad,
  onOpenImageModal,
  onRemoveImage,
  onSelectImage,
}: DocumentPageSurfaceLayoutProps) {
  const renderCenteredImageOnly = layout === 'image-center' && displayImageUrl
  const surfaceStyle = {
    paddingLeft,
    paddingRight,
    minHeight: `${SURFACE_MIN_HEIGHT}px`,
  }
  const sharedImageSlotProps = {
    kind,
    imageUrl: displayImageUrl,
    imageAlt: imageAlt || imageInjectableLabel || '',
    imageWidth,
    preserveAspectRatio: Boolean(imageInjectableId),
    editable,
    active,
    selected: imageSelected,
    imageRef,
    onOpenModal: onOpenImageModal,
    onSelect: onSelectImage,
    onLoad: onImageLoad,
    onRemove: onRemoveImage,
    className: 'shrink-0',
  } satisfies ImageSlotProps

  if (layout === 'image-left') {
    return (
      <div className="py-3" style={surfaceStyle}>
        {displayImageUrl ? (
          <div ref={rowRef} className="flex h-24 min-w-0 flex-nowrap items-stretch gap-4 overflow-hidden">
            <ImageSlot {...sharedImageSlotProps} />
            {textSlot}
          </div>
        ) : (
          textSlot
        )}
      </div>
    )
  }

  if (layout === 'image-right') {
    return (
      <div className="py-3" style={surfaceStyle}>
        {displayImageUrl ? (
          <div ref={rowRef} className="flex h-24 min-w-0 flex-nowrap items-stretch gap-4 overflow-hidden">
            {textSlot}
            <ImageSlot {...sharedImageSlotProps} />
          </div>
        ) : (
          textSlot
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'py-3',
        renderCenteredImageOnly ? 'flex h-24 items-center justify-center' : 'flex'
      )}
      style={surfaceStyle}
    >
      {renderCenteredImageOnly ? (
        <div ref={rowRef} className="flex h-24 w-full min-w-0 flex-nowrap items-center justify-center overflow-hidden">
          <ImageSlot {...sharedImageSlotProps} />
        </div>
      ) : (
        textSlot
      )}
    </div>
  )
}
