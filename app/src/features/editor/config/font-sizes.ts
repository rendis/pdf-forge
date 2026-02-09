export interface FontSizeOption {
  value: number
  label: string
}

export const TOOLBAR_FONT_SIZES: FontSizeOption[] = [
  { value: 10, label: '10' },
  { value: 11, label: '11' },
  { value: 12, label: '12' },
  { value: 14, label: '14' },
  { value: 16, label: '16' },
  { value: 18, label: '18' },
  { value: 24, label: '24' },
  { value: 36, label: '36' },
]

export const STYLE_PANEL_FONT_SIZES: FontSizeOption[] =
  TOOLBAR_FONT_SIZES.filter((s) => s.value <= 18)
