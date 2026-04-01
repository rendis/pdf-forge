import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/core'
import type { PortableDocument } from '../types/document-format'
import { importDocument } from './document-import'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { PAGE_SIZES } from '../types'

function createEditor(): Editor {
  return {
    commands: {
      setContent: vi.fn(() => true),
    },
  } as unknown as Editor
}

function createDocument(overrides: Partial<PortableDocument> = {}): PortableDocument {
  return {
    version: '2.1.0',
    meta: { title: 'Doc', language: 'es' },
    pageConfig: {
      formatId: 'A4',
      width: 794,
      height: 1123,
      margins: { top: 96, bottom: 96, left: 96, right: 96 },
    },
    variableIds: [],
    content: { type: 'doc', content: [] },
    exportInfo: {
      exportedAt: new Date('2026-03-29T00:00:00.000Z').toISOString(),
      sourceApp: 'pdf-forge-test',
    },
    ...overrides,
  }
}

describe('document-import header handling', () => {
  beforeEach(() => {
    useDocumentHeaderStore.getState().reset()
  })

  it('restores header state when present', () => {
    const editor = createEditor()
    const setPaginationConfig = vi.fn()

    const result = importDocument(
      createDocument({
        header: {
          enabled: true,
          layout: 'image-left',
          imageInjectableId: 'header_logo',
          imageInjectableLabel: 'Header Logo',
          imageWidth: 100,
          imageHeight: 32,
          content: {
            type: 'doc',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'Empresa' }],
            }],
          },
        },
      }),
      editor,
      { setPaginationConfig }
    )

    expect(result.success).toBe(true)
    expect(setPaginationConfig).toHaveBeenCalledWith({
      pageSize: PAGE_SIZES.A4,
      margins: { top: 96, bottom: 96, left: 96, right: 96 },
    })
    expect(useDocumentHeaderStore.getState()).toMatchObject({
      enabled: true,
      layout: 'image-left',
      imageInjectableId: 'header_logo',
      imageInjectableLabel: 'Header Logo',
      imageWidth: 100,
      imageHeight: 32,
    })
  })

  it('resets stale header state when importing a document without header and migrates 2.0.0 -> 2.1.0', () => {
    useDocumentHeaderStore.getState().configure({
      imageInjectableId: 'stale_logo',
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Old header' }],
        }],
      },
    })

    const editor = createEditor()
    const setPaginationConfig = vi.fn()

    const result = importDocument(
      createDocument({ version: '2.0.0', header: undefined }),
      editor,
      { setPaginationConfig }
    )

    expect(result.success).toBe(true)
    expect(result.document?.version).toBe('2.1.0')
    expect(useDocumentHeaderStore.getState()).toMatchObject({
      enabled: false,
      imageUrl: null,
      imageInjectableId: null,
      content: null,
    })
  })
})
