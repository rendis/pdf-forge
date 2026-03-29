export const LINE_SPACING_PRESETS = {
  tight: {
    labelKey: 'editor.toolbar.lineSpacingTight',
    cssLineHeight: '1.00',
    typstLeading: '0em',
  },
  compact: {
    labelKey: 'editor.toolbar.lineSpacingCompact',
    cssLineHeight: '1.15',
    typstLeading: '0.15em',
  },
  normal: {
    labelKey: 'editor.toolbar.lineSpacingNormal',
    cssLineHeight: '1.50',
    typstLeading: '0.50em',
  },
  relaxed: {
    labelKey: 'editor.toolbar.lineSpacingRelaxed',
    cssLineHeight: '2.00',
    typstLeading: '1.00em',
  },
  loose: {
    labelKey: 'editor.toolbar.lineSpacingLoose',
    cssLineHeight: '2.50',
    typstLeading: '1.50em',
  },
} as const

export type LineSpacingPreset = keyof typeof LINE_SPACING_PRESETS

export const DEFAULT_LINE_SPACING: LineSpacingPreset = 'normal'

export function normalizeLineSpacingPreset(
  value?: string | null,
): LineSpacingPreset {
  if (!value) return DEFAULT_LINE_SPACING

  return value in LINE_SPACING_PRESETS
    ? (value as LineSpacingPreset)
    : DEFAULT_LINE_SPACING
}

export function getLineSpacingCssValue(value?: string | null): string {
  const preset = normalizeLineSpacingPreset(value)
  return LINE_SPACING_PRESETS[preset].cssLineHeight
}

export function getLineSpacingTypstLeading(value?: string | null): string {
  const preset = normalizeLineSpacingPreset(value)
  return LINE_SPACING_PRESETS[preset].typstLeading
}
