// Table extension components
export { TableExtension } from './TableExtension'
export { TableRowExtension } from './TableRowExtension'
export { TableHeaderExtension } from './TableHeaderExtension'
export { TableCellExtension } from './TableCellExtension'
export { TableStylesPanel } from './TableStylesPanel'

// Re-export types
export type {
  TableStylesAttrs,
  TableAttrs,
  TableCellAttrs,
} from './types'

export {
  DEFAULT_TABLE_STYLES,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  TEXT_ALIGN_OPTIONS,
} from './types'

// Convenience function to get all table extensions for easy registration
export const getTableExtensions = () => [
  TableExtension.configure({
    resizable: true,
  }),
  TableRowExtension,
  TableHeaderExtension,
  TableCellExtension,
]
