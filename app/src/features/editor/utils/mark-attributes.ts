import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'

/**
 * Reads mark attributes accounting for NodeSelection on atom nodes.
 * When an atom node (e.g. injector) is selected, editor.getAttributes()
 * reads from $from.marks() which may not reflect the node's own marks.
 * This helper checks the node's marks directly for NodeSelection.
 */
export function getEffectiveMarkAttrs(
  editor: Editor,
  markType: string,
): Record<string, unknown> {
  const { selection } = editor.state
  if (selection instanceof NodeSelection) {
    const mark = selection.node.marks.find((m) => m.type.name === markType)
    if (mark) return mark.attrs
  }
  return editor.getAttributes(markType)
}
