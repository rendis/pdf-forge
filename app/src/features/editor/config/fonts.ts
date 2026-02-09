export interface FontFamilyOption {
  label: string
  value: string
}

export const TOOLBAR_FONT_FAMILIES: FontFamilyOption[] = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
]

export const STYLE_PANEL_FONT_FAMILIES: FontFamilyOption[] = [
  { label: 'Default', value: 'inherit' },
  ...TOOLBAR_FONT_FAMILIES,
]
