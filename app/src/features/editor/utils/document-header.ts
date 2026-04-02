import type { JSONContent } from '@tiptap/core'

export interface DocumentHeaderSnapshot {
  imageUrl?: string | null
  imageInjectableId?: string | null
  content?: JSONContent | null
}

function hasTextOrStructuralContent(node: unknown): boolean {
  if (!node || typeof node !== 'object') {
    return false
  }

  const proseNode = node as {
    type?: string
    text?: string
    content?: unknown[]
  }

  if (typeof proseNode.text === 'string' && proseNode.text.trim().length > 0) {
    return true
  }

  if (proseNode.type === 'horizontalRule') {
    return true
  }

  if (proseNode.type === 'injector') {
    return true
  }

  if (!Array.isArray(proseNode.content)) {
    return false
  }

  return proseNode.content.some(hasTextOrStructuralContent)
}

export function hasHeaderImage(imageUrl?: string | null): boolean {
  return typeof imageUrl === 'string' && imageUrl.trim().length > 0
}

export function hasHeaderImageInjectable(imageInjectableId?: string | null): boolean {
  return typeof imageInjectableId === 'string' && imageInjectableId.trim().length > 0
}

export function hasMeaningfulHeaderContent(
  content?: JSONContent | null
): boolean {
  return hasTextOrStructuralContent(content)
}

export function deriveHeaderEnabled(snapshot: DocumentHeaderSnapshot): boolean {
  return (
    hasHeaderImage(snapshot.imageUrl) ||
    hasHeaderImageInjectable(snapshot.imageInjectableId) ||
    hasMeaningfulHeaderContent(snapshot.content)
  )
}

function isParagraphNode(node: JSONContent | undefined): node is JSONContent {
  return Boolean(node && node.type === 'paragraph')
}

function attrsKey(node: JSONContent): string {
  return JSON.stringify(node.attrs ?? {})
}

export function normalizeHeaderContent(content?: JSONContent | null): JSONContent | null {
  if (!content || content.type !== 'doc' || !Array.isArray(content.content)) {
    return content ?? null
  }

  const nodes = content.content as JSONContent[]
  if (nodes.length <= 1) {
    return content
  }

  const normalized: JSONContent[] = []

  for (const node of nodes) {
    const previous = normalized.at(-1)
    const canMerge =
      isParagraphNode(previous) &&
      isParagraphNode(node) &&
      attrsKey(previous) === attrsKey(node)

    if (!canMerge) {
      normalized.push({
        ...node,
        attrs: node.attrs ? { ...node.attrs } : undefined,
        content: Array.isArray(node.content) ? [...node.content] : node.content,
      })
      continue
    }

    const previousContent = Array.isArray(previous.content) ? [...previous.content] : []
    const nextContent = Array.isArray(node.content) ? [...node.content] : []

    if (previousContent.length > 0) {
      previousContent.push({ type: 'hardBreak' })
    }

    previous.content = [...previousContent, ...nextContent]
  }

  return {
    ...content,
    content: normalized,
  }
}
