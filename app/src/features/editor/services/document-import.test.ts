import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/core'
import type { PortableDocument } from '../types/document-format'
import { importDocument } from './document-import'
import { exportDocument } from './document-export'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { usePaginationStore } from '../stores/pagination-store'
import { PAGE_SIZES, DEFAULT_MARGINS } from '../types'

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

  it('restores header text injector content to store after import', () => {
    const editor = createEditor()
    const setPaginationConfig = vi.fn()

    const result = importDocument(
      createDocument({
        variableIds: ['greeting'],
        header: {
          enabled: true,
          layout: 'image-left',
          content: {
            type: 'doc',
            content: [{
              type: 'paragraph',
              content: [{ type: 'injector', attrs: { variableId: 'greeting', type: 'text' } }],
            }],
          },
        },
      }),
      editor,
      { setPaginationConfig }
    )

    expect(result.success).toBe(true)
    expect(useDocumentHeaderStore.getState().enabled).toBe(true)
    expect(useDocumentHeaderStore.getState().content?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'paragraph',
          content: expect.arrayContaining([
            expect.objectContaining({ type: 'injector', attrs: expect.objectContaining({ variableId: 'greeting' }) }),
          ]),
        }),
      ])
    )
  })

  it('full roundtrip: export with header text injector then re-import produces consistent state', () => {
    // Step 1: set up header store as click/drag insertion would
    usePaginationStore.setState({ pageSize: PAGE_SIZES.A4, margins: DEFAULT_MARGINS })
    useDocumentHeaderStore.getState().configure({
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'injector', attrs: { variableId: 'greeting', type: 'text' } }] }],
      },
    })

    // Step 2: export
    const mockEditor = { getJSON: () => ({ type: 'doc', content: [] }) } as unknown as Editor
    const exported = exportDocument(
      mockEditor,
      { pagination: { pageSize: PAGE_SIZES.A4, margins: DEFAULT_MARGINS } },
      { title: 'Roundtrip', language: 'es' }
    )

    expect(exported.variableIds).toContain('greeting')

    // Step 3: reset and re-import
    useDocumentHeaderStore.getState().reset()

    const editor = createEditor()
    const result = importDocument(exported, editor, { setPaginationConfig: vi.fn() })

    expect(result.success).toBe(true)
    expect(result.document?.variableIds).toContain('greeting')
    // The injector is inside a paragraph — match the paragraph that contains it
    expect(useDocumentHeaderStore.getState().content?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'paragraph',
          content: expect.arrayContaining([
            expect.objectContaining({ type: 'injector', attrs: expect.objectContaining({ variableId: 'greeting' }) }),
          ]),
        }),
      ])
    )
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
