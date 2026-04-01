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
