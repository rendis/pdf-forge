export const HEADER_IMAGE_HEIGHT = 96
export const HEADER_IMAGE_MIN_WIDTH = 32
export const HEADER_IMAGE_GAP = 16
export const HEADER_TEXT_MIN_WIDTH = 240
export const HEADER_TEXT_HEIGHT = 96
export const HEADER_OVERFLOW_TOLERANCE = 4
export const HEADER_SURFACE_VERTICAL_PADDING = 12
export const HEADER_SURFACE_MIN_HEIGHT = HEADER_TEXT_HEIGHT + HEADER_SURFACE_VERTICAL_PADDING * 2

interface RowWidthParams {
  rowWidth?: number
  surfaceWidth?: number
  paddingLeft: number
  paddingRight: number
}

export function getHeaderRowWidth({
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

export function calculateScaledHeaderImageWidth(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number
): number {
  if (!naturalWidth || !naturalHeight) {
    return HEADER_IMAGE_MIN_WIDTH
  }

  const scaledWidth = naturalWidth * (HEADER_IMAGE_HEIGHT / naturalHeight)
  const boundedWidth = Math.min(maxWidth, Math.max(HEADER_IMAGE_MIN_WIDTH, scaledWidth))

  return Math.round(boundedWidth)
}

export function shouldRestoreHeaderContent(lastInputType: string | null): boolean {
  const isDeletion = lastInputType?.startsWith('delete') ?? false
  const isHistoryAction = lastInputType === 'historyUndo' || lastInputType === 'historyRedo'

  return !isDeletion && !isHistoryAction
}
