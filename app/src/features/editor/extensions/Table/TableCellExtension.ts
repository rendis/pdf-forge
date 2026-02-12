import { TableCell } from '@tiptap/extension-table'

export const TableCellExtension = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Add background color attribute for individual cell styling
      background: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.background) return {}
          return {
            style: `background-color: ${attributes.background}`,
          }
        },
      },
    }
  },
})
