// Table styles that can be configured by users
export interface TableStylesAttrs {
  // Header styles
  headerFontFamily?: string
  headerFontSize?: number
  headerFontWeight?: string
  headerTextColor?: string
  headerTextAlign?: 'left' | 'center' | 'right'
  headerBackground?: string
  // Body styles
  bodyFontFamily?: string
  bodyFontSize?: number
  bodyFontWeight?: string
  bodyTextColor?: string
  bodyTextAlign?: 'left' | 'center' | 'right'
}

// Full table attributes including styles
export interface TableAttrs extends TableStylesAttrs {
  // Standard table attributes from TipTap
  colwidth?: number[] | null
}

// Cell attributes
export interface TableCellAttrs {
  colspan?: number
  rowspan?: number
  colwidth?: number[] | null
  background?: string
}

// Default styles
export const DEFAULT_TABLE_STYLES: TableStylesAttrs = {
  headerFontFamily: undefined,
  headerFontSize: 12,
  headerFontWeight: 'bold',
  headerTextColor: '#333333',
  headerTextAlign: 'left',
  headerBackground: '#f5f5f5',
  bodyFontFamily: undefined,
  bodyFontSize: 12,
  bodyFontWeight: 'normal',
  bodyTextColor: '#333333',
  bodyTextAlign: 'left',
}

// Font options for the styles panel
export const FONT_FAMILY_OPTIONS = [
  { value: 'inherit', label: 'Default' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
]

export const FONT_SIZE_OPTIONS = [
  { value: 10, label: '10px' },
  { value: 11, label: '11px' },
  { value: 12, label: '12px' },
  { value: 14, label: '14px' },
  { value: 16, label: '16px' },
  { value: 18, label: '18px' },
]

export const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]
