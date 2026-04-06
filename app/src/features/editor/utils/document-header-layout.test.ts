import { describe, expect, it } from 'vitest'
import {
  HEADER_IMAGE_HEIGHT,
  HEADER_IMAGE_MIN_WIDTH,
  calculateScaledHeaderImageWidth,
  getHeaderRowWidth,
  shouldRestoreHeaderContent,
} from './document-header-layout'

describe('document-header-layout', () => {
  it('uses row width when available', () => {
    expect(
      getHeaderRowWidth({ rowWidth: 640, surfaceWidth: 900, paddingLeft: 32, paddingRight: 32 })
    ).toBe(640)
  })

  it('falls back to surface width minus padding', () => {
    expect(
      getHeaderRowWidth({ surfaceWidth: 900, paddingLeft: 32, paddingRight: 32 })
    ).toBe(836)
  })

  it('scales image width keeping the configured header height', () => {
    const width = calculateScaledHeaderImageWidth(400, 200, 300)
    expect(width).toBe(Math.round(400 * (HEADER_IMAGE_HEIGHT / 200)))
  })

  it('clamps scaled width to the minimum width when image metadata is invalid', () => {
    expect(calculateScaledHeaderImageWidth(0, 0, 300)).toBe(HEADER_IMAGE_MIN_WIDTH)
  })

  it('does not restore content for delete/history actions', () => {
    expect(shouldRestoreHeaderContent('deleteContentBackward')).toBe(false)
    expect(shouldRestoreHeaderContent('historyUndo')).toBe(false)
    expect(shouldRestoreHeaderContent('insertText')).toBe(true)
  })
})
