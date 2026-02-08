import type { Node } from '@tiptap/pm/model'

/** Información de un nodo página encontrado */
export interface PageNodeInfo {
  node: Node
  pos: number
  start: number
  depth: number
}

/** Resultado de búsqueda de página */
export type FindPageResult = PageNodeInfo | null
