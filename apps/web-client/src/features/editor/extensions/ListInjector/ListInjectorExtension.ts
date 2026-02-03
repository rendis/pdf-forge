import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ListInjectorComponent } from './ListInjectorComponent'
import type { ListInjectorOptions, ListStylesAttrs } from './types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    listInjector: {
      /**
       * Insert a list injector
       */
      setListInjector: (options: ListInjectorOptions) => ReturnType
      /**
       * Update list injector styles
       */
      setListInjectorStyles: (styles: Partial<ListStylesAttrs>) => ReturnType
    }
  }
}

export const ListInjectorExtension = Node.create({
  name: 'listInjector',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      variableId: {
        default: null,
      },
      label: {
        default: 'Dynamic List',
      },
      lang: {
        default: 'en',
      },
      symbol: {
        default: 'bullet',
      },
      // Header style overrides
      headerFontFamily: { default: null },
      headerFontSize: { default: null },
      headerFontWeight: { default: null },
      headerTextColor: { default: null },
      // Item style overrides
      itemFontFamily: { default: null },
      itemFontSize: { default: null },
      itemFontWeight: { default: null },
      itemTextColor: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="listInjector"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'listInjector' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ListInjectorComponent)
  },

  addCommands() {
    return {
      setListInjector:
        (options: ListInjectorOptions) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              variableId: options.variableId,
              label: options.label || 'Dynamic List',
              lang: options.lang || 'en',
              symbol: options.symbol || 'bullet',
            },
          })
        },
      setListInjectorStyles:
        (styles: Partial<ListStylesAttrs>) =>
        ({ commands }) => {
          return commands.updateAttributes('listInjector', styles)
        },
    }
  },
})
