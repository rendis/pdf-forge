// Surface rendering constants (shared by header and footer)
export const SURFACE_IMAGE_HEIGHT = 96
export const SURFACE_IMAGE_MIN_WIDTH = 32
export const SURFACE_IMAGE_GAP = 16
export const SURFACE_TEXT_MIN_WIDTH = 240
export const SURFACE_TEXT_HEIGHT = 96
export const SURFACE_OVERFLOW_TOLERANCE = 4
export const SURFACE_VERTICAL_PADDING = 12
export const SURFACE_MIN_HEIGHT = SURFACE_TEXT_HEIGHT + SURFACE_VERTICAL_PADDING * 2


interface RowWidthParams {
  rowWidth?: number
  surfaceWidth?: number
  paddingLeft: number
  paddingRight: number
}

export function getSurfaceRowWidth({
  rowWidth,
  surfaceWidth = 0,
  paddingLeft,
  paddingRight,
}: RowWidthParams): number {
  if (rowWidth && rowWidth > 0) {
    return rowWidth
  }

  return Math.max(surfaceWidth - paddingLeft - paddingRight, 0)
}

export function calculateScaledSurfaceImageWidth(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number
): number {
  if (!naturalWidth || !naturalHeight) {
    return SURFACE_IMAGE_MIN_WIDTH
  }

  const scaledWidth = naturalWidth * (SURFACE_IMAGE_HEIGHT / naturalHeight)
  const boundedWidth = Math.min(maxWidth, Math.max(SURFACE_IMAGE_MIN_WIDTH, scaledWidth))

  return Math.round(boundedWidth)
}


export function shouldRestoreSurfaceContent(lastInputType: string | null): boolean {
  const isDeletion = lastInputType?.startsWith('delete') ?? false
  const isHistoryAction = lastInputType === 'historyUndo' || lastInputType === 'historyRedo'

  return !isDeletion && !isHistoryAction
}

