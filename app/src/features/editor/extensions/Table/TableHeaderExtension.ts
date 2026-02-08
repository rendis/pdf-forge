import { TableHeader } from '@tiptap/extension-table'

export const TableHeaderExtension = TableHeader.extend({
  // Extend to allow inline content (including injectors)
  content: 'inline*',
})
