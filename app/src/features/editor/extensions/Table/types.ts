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

// Re-export constants from centralized config
export { DEFAULT_TABLE_STYLES, TEXT_ALIGN_OPTIONS } from '../../config'
export { STYLE_PANEL_FONT_FAMILIES as FONT_FAMILY_OPTIONS, STYLE_PANEL_FONT_SIZES as FONT_SIZE_OPTIONS } from '../../config'
