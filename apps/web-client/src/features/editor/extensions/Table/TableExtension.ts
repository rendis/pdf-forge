import { Table } from '@tiptap/extension-table'
import type { TableStylesAttrs } from './types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableStyles: {
      /**
       * Set table styles
       */
      setTableStyles: (styles: Partial<TableStylesAttrs>) => ReturnType
    }
  }
}

export const TableExtension = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Header styles
      headerFontFamily: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-font-family'),
        renderHTML: (attributes) => {
          if (!attributes.headerFontFamily) return {}
          return { 'data-header-font-family': attributes.headerFontFamily }
        },
      },
      headerFontSize: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-header-font-size')
          return val ? parseInt(val, 10) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.headerFontSize) return {}
          return { 'data-header-font-size': attributes.headerFontSize }
        },
      },
      headerFontWeight: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-font-weight'),
        renderHTML: (attributes) => {
          if (!attributes.headerFontWeight) return {}
          return { 'data-header-font-weight': attributes.headerFontWeight }
        },
      },
      headerTextColor: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-text-color'),
        renderHTML: (attributes) => {
          if (!attributes.headerTextColor) return {}
          return { 'data-header-text-color': attributes.headerTextColor }
        },
      },
      headerTextAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-text-align'),
        renderHTML: (attributes) => {
          if (!attributes.headerTextAlign) return {}
          return { 'data-header-text-align': attributes.headerTextAlign }
        },
      },
      headerBackground: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-background'),
        renderHTML: (attributes) => {
          if (!attributes.headerBackground) return {}
          return { 'data-header-background': attributes.headerBackground }
        },
      },
      // Body styles
      bodyFontFamily: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-body-font-family'),
        renderHTML: (attributes) => {
          if (!attributes.bodyFontFamily) return {}
          return { 'data-body-font-family': attributes.bodyFontFamily }
        },
      },
      bodyFontSize: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-body-font-size')
          return val ? parseInt(val, 10) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.bodyFontSize) return {}
          return { 'data-body-font-size': attributes.bodyFontSize }
        },
      },
      bodyFontWeight: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-body-font-weight'),
        renderHTML: (attributes) => {
          if (!attributes.bodyFontWeight) return {}
          return { 'data-body-font-weight': attributes.bodyFontWeight }
        },
      },
      bodyTextColor: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-body-text-color'),
        renderHTML: (attributes) => {
          if (!attributes.bodyTextColor) return {}
          return { 'data-body-text-color': attributes.bodyTextColor }
        },
      },
      bodyTextAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-body-text-align'),
        renderHTML: (attributes) => {
          if (!attributes.bodyTextAlign) return {}
          return { 'data-body-text-align': attributes.bodyTextAlign }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTableStyles:
        (styles: Partial<TableStylesAttrs>) =>
        ({ commands }) => {
          return commands.updateAttributes('table', styles)
        },
    }
  },
})
