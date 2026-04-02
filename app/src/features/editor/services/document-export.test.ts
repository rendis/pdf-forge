import { beforeEach, describe, expect, it } from 'vitest'
import type { Editor } from '@tiptap/core'
import { exportDocument, extractVariableIdsFromEditor } from './document-export'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { usePaginationStore } from '../stores/pagination-store'
import { DEFAULT_MARGINS, PAGE_SIZES } from '../types'

function createEditor(json: unknown): Editor {
  return {
    getJSON: () => json,
  } as unknown as Editor
}

describe('document-export header/image injectables', () => {
  beforeEach(() => {
    useDocumentHeaderStore.getState().reset()
    usePaginationStore.setState({
      pageSize: PAGE_SIZES.A4,
      margins: DEFAULT_MARGINS,
    })
  })

  it('serializes header state and includes body/header image injectable IDs', () => {
    useDocumentHeaderStore.getState().configure({
      layout: 'image-right',
      imageInjectableId: 'header_logo',
      imageInjectableLabel: 'Header Logo',
      imageWidth: 120,
      imageHeight: 40,
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'ACME Corp' }],
        }],
      },
    })

    const editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
        {
          type: 'injector',
          attrs: { variableId: 'customer_name' },
        },
        {
          type: 'customImage',
          attrs: { injectableId: 'body_logo', src: '' },
        },
      ],
    })

    const document = exportDocument(
      editor,
      {
        pagination: {
          pageSize: PAGE_SIZES.A4,
          margins: DEFAULT_MARGINS,
        },
      },
      {
        title: 'Ficha',
        language: 'es',
      }
    )

    expect(document.version).toBe('2.1.0')
    expect(document.variableIds).toEqual(['body_logo', 'customer_name', 'header_logo'])
    expect(document.header).toMatchObject({
      enabled: true,
      layout: 'image-right',
      imageInjectableId: 'header_logo',
      imageInjectableLabel: 'Header Logo',
      imageWidth: 120,
      imageHeight: 40,
    })
  })

  it('extracts header image injectable IDs directly from the editor context', () => {
    useDocumentHeaderStore.getState().configure({
      imageInjectableId: 'header_only_logo',
    })

    const editor = createEditor({ type: 'doc', content: [] })

    expect(extractVariableIdsFromEditor(editor)).toEqual(['header_only_logo'])
  })
})

describe('document-export header text injectors', () => {
  beforeEach(() => {
    useDocumentHeaderStore.getState().reset()
    usePaginationStore.setState({
      pageSize: PAGE_SIZES.A4,
      margins: DEFAULT_MARGINS,
    })
  })

  it('exports variable ID from a text injector inserted into header content', () => {
    // Simulates the store state produced by click or drag insertion into the header editor
    useDocumentHeaderStore.getState().configure({
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'injector', attrs: { variableId: 'greeting', type: 'text' } }],
        }],
      },
    })

    const editor = createEditor({ type: 'doc', content: [] })

    const document = exportDocument(
      editor,
      { pagination: { pageSize: PAGE_SIZES.A4, margins: DEFAULT_MARGINS } },
      { title: 'Test', language: 'es' }
    )

    expect(document.variableIds).toContain('greeting')
    expect(document.header?.content?.content).toEqual(
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

  it('deduplicates variable IDs when the same injector appears in both body and header', () => {
    useDocumentHeaderStore.getState().configure({
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'injector', attrs: { variableId: 'name', type: 'text' } }] }],
      },
    })

    const editor = createEditor({
      type: 'doc',
      content: [{ type: 'injector', attrs: { variableId: 'name' } }],
    })

    const document = exportDocument(
      editor,
      { pagination: { pageSize: PAGE_SIZES.A4, margins: DEFAULT_MARGINS } },
      { title: 'Test', language: 'es' }
    )

    const nameOccurrences = document.variableIds.filter((id) => id === 'name')
    expect(nameOccurrences).toHaveLength(1)
  })

  it('extractVariableIdsFromEditor includes header text injector IDs', () => {
    useDocumentHeaderStore.getState().configure({
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'injector', attrs: { variableId: 'greeting', type: 'text' } }] }],
      },
    })

    const editor = createEditor({ type: 'doc', content: [] })

    expect(extractVariableIdsFromEditor(editor)).toContain('greeting')
  })
})
