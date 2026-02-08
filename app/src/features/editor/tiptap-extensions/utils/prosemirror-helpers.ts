import type { Selection } from '@tiptap/pm/state'
import type { FindPageResult } from '../types'

const PAGE_NODE_NAME = 'page'

/**
 * Encuentra el nodo página padre de la selección actual
 */
export const findParentPage = (selection: Selection): FindPageResult => {
  const { $anchor } = selection
  for (let d = $anchor.depth; d > 0; d--) {
    const node = $anchor.node(d)
    if (node.type.name === PAGE_NODE_NAME) {
      return {
        node,
        pos: $anchor.before(d),
        start: $anchor.start(d),
        depth: d,
      }
    }
  }
  return null
}

/**
 * Verifica si el cursor está al inicio de una página
 */
export const isAtPageStart = (
  selection: Selection,
  pageStart: number
): boolean => {
  const { $anchor } = selection
  const relativePos = $anchor.pos - pageStart
  return relativePos <= 1
}
