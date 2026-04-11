import { describe, expect, it } from 'vitest'
import {
  SURFACE_IMAGE_HEIGHT,
  SURFACE_IMAGE_MIN_WIDTH,
  calculateScaledSurfaceImageWidth,
  getSurfaceRowWidth,
  shouldRestoreSurfaceContent,
} from './document-surface-layout'

describe('document-surface-layout', () => {
  it('uses row width when available', () => {
    expect(
      getSurfaceRowWidth({ rowWidth: 640, surfaceWidth: 900, paddingLeft: 32, paddingRight: 32 })
    ).toBe(640)
  })

  it('falls back to surface width minus padding', () => {
    expect(
      getSurfaceRowWidth({ surfaceWidth: 900, paddingLeft: 32, paddingRight: 32 })
    ).toBe(836)
  })

  it('scales image width keeping the configured header height', () => {
    const width = calculateScaledSurfaceImageWidth(400, 200, 300)
    expect(width).toBe(Math.round(400 * (SURFACE_IMAGE_HEIGHT / 200)))
  })

  it('clamps scaled width to the minimum width when image metadata is invalid', () => {
    expect(calculateScaledSurfaceImageWidth(0, 0, 300)).toBe(SURFACE_IMAGE_MIN_WIDTH)
  })

  it('does not restore content for delete/history actions', () => {
    expect(shouldRestoreSurfaceContent('deleteContentBackward')).toBe(false)
    expect(shouldRestoreSurfaceContent('historyUndo')).toBe(false)
    expect(shouldRestoreSurfaceContent('insertText')).toBe(true)
  })
})
