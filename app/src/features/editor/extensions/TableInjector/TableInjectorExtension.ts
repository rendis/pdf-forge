import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TableInjectorComponent } from './TableInjectorComponent'
import type { TableInjectorOptions } from './types'
import type { TableStylesAttrs } from '../Table/types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableInjector: {
      /**
       * Insert a table injector
       */
      setTableInjector: (options: TableInjectorOptions) => ReturnType
      /**
       * Update table injector styles
       */
      setTableInjectorStyles: (styles: Partial<TableStylesAttrs>) => ReturnType
    }
  }
}

export const TableInjectorExtension = Node.create({
  name: 'tableInjector',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      variableId: {
        default: null,
      },
      label: {
        default: 'Dynamic Table',
      },
      lang: {
        default: 'en',
      },
      // Header style overrides
      headerFontFamily: { default: null },
      headerFontSize: { default: null },
      headerFontWeight: { default: null },
      headerTextColor: { default: null },
      headerTextAlign: { default: null },
      headerBackground: { default: null },
      // Body style overrides
      bodyFontFamily: { default: null },
      bodyFontSize: { default: null },
      bodyFontWeight: { default: null },
      bodyTextColor: { default: null },
      bodyTextAlign: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="tableInjector"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'tableInjector' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableInjectorComponent)
  },

  addCommands() {
    return {
      setTableInjector:
        (options: TableInjectorOptions) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              variableId: options.variableId,
              label: options.label || 'Dynamic Table',
              lang: options.lang || 'en',
            },
          })
        },
      setTableInjectorStyles:
        (styles: Partial<TableStylesAttrs>) =>
        ({ commands }) => {
          return commands.updateAttributes('tableInjector', styles)
        },
    }
  },
})
