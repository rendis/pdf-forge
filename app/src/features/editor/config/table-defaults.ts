import { BASE_TEXT_COLOR, TABLE_HEADER_BG } from './colors'
import type { TableStylesAttrs } from '../extensions/Table/types'

export const DEFAULT_TABLE_STYLES: TableStylesAttrs = {
  headerFontFamily: undefined,
  headerFontSize: 12,
  headerFontWeight: 'bold',
  headerTextColor: BASE_TEXT_COLOR,
  headerTextAlign: 'left',
  headerBackground: TABLE_HEADER_BG,
  bodyFontFamily: undefined,
  bodyFontSize: 12,
  bodyFontWeight: 'normal',
  bodyTextColor: BASE_TEXT_COLOR,
  bodyTextAlign: 'left',
}

export const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const
