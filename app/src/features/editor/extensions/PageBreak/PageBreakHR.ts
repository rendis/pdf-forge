import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { PageBreakHRComponent } from './PageBreakHRComponent'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType
    }
  }
}

export const PageBreakHR = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      type: {
        default: 'pagebreak',
      },
    }
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakHRComponent)
  },

  parseHTML() {
    return [
      { tag: 'hr[data-type="pagebreak"]' },
      { tag: 'hr.page-break' },
      { tag: 'hr.manual-page-break' },
      { tag: 'div[data-type="page-break"]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'hr',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'pagebreak',
        class: 'manual-page-break',
      }),
    ]
  },
})
