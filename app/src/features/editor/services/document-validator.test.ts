import { describe, expect, it } from 'vitest'
import type { PortableDocument } from '../types/document-format'
import { getUsedVariableIds, validateDocumentSemantics } from './document-validator'

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

describe('document-validator image injectables', () => {
  it('warns when body/header image injectables are not declared in variableIds', () => {
    const document = createDocument({
      content: {
        type: 'doc',
        content: [{ type: 'customImage', attrs: { injectableId: 'body_logo' } }],
      },
      header: {
        enabled: true,
        layout: 'image-left',
        imageInjectableId: 'header_logo',
      },
    })

    const result = validateDocumentSemantics(document, { validateReferences: true })

    expect(result.valid).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNDEFINED_IMAGE_VARIABLE',
          path: 'content.content[0].attrs.injectableId',
        }),
        expect.objectContaining({
          code: 'UNDEFINED_IMAGE_VARIABLE',
          path: 'header.imageInjectableId',
        }),
      ])
    )
  })

  it('tracks image injectables used only in body/header', () => {
    const document = createDocument({
      content: {
        type: 'doc',
        content: [{ type: 'image', attrs: { injectableId: 'body_logo' } }],
      },
      header: {
        enabled: true,
        layout: 'image-right',
        imageInjectableId: 'header_logo',
      },
    })

    expect(getUsedVariableIds(document)).toEqual(['body_logo', 'header_logo'])
  })
})
