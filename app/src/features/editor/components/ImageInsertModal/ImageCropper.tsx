import { useRef, useState, useCallback } from 'react'
import { Cropper, CropperRef, CircleStencil } from 'react-advanced-cropper'
import 'react-advanced-cropper/dist/style.css'
import { X, RotateCcw, Square, Circle } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import type { ImageShape } from '../../extensions/Image/types'
import type { ImageCropperProps } from './types'

const MAX_WIDTH = 1200
const MAX_HEIGHT = 800
const PNG_QUALITY = 0.9

export function ImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onSave,
  maxWidth = MAX_WIDTH,
  maxHeight = MAX_HEIGHT,
  initialShape = 'square',
}: ImageCropperProps) {
  const cropperRef = useRef<CropperRef>(null)
  const [shape, setShape] = useState<ImageShape>(initialShape)

  // Handle dialog open state change and reset shape
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setShape(initialShape)
    }
    onOpenChange(isOpen)
  }, [onOpenChange, initialShape])

  const handleReset = useCallback(() => {
    cropperRef.current?.reset()
  }, [])

  const handleSave = useCallback(() => {
    const cropper = cropperRef.current
    if (!cropper) return

    const canvas = cropper.getCanvas({
      maxWidth,
      maxHeight,
    })

    if (!canvas) return

    const croppedImage = canvas.toDataURL('image/png', PNG_QUALITY)
    onSave(croppedImage, shape)
    onOpenChange(false)
  }, [maxWidth, maxHeight, onSave, shape, onOpenChange])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div>
              <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                Recortar imagen
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm font-light text-muted-foreground">
                Ajusta el área de recorte
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Shape selector */}
            <div className="mb-4 flex items-center gap-2">
              <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Forma:
              </span>
              <button
                type="button"
                onClick={() => setShape('square')}
                className={cn(
                  'flex items-center gap-1.5 rounded-none border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors',
                  shape === 'square'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                )}
              >
                <Square className="h-3.5 w-3.5" />
                Cuadrado
              </button>
              <button
                type="button"
                onClick={() => setShape('circle')}
                className={cn(
                  'flex items-center gap-1.5 rounded-none border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors',
                  shape === 'circle'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                )}
              >
                <Circle className="h-3.5 w-3.5" />
                Circular
              </button>
            </div>

            {/* Cropper */}
            <div className="relative h-[400px] overflow-hidden bg-muted">
              <Cropper
                ref={cropperRef}
                src={imageSrc}
                stencilComponent={shape === 'circle' ? CircleStencil : undefined}
                stencilProps={{
                  grid: true,
                  aspectRatio: shape === 'circle' ? 1 : undefined,
                }}
                className="h-full"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border p-6">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-none border border-border bg-background px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
              >
                Aplicar recorte
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
