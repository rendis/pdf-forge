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

describe('document-validator header text injectors', () => {
  it('does not warn when header injector references a declared variable', () => {
    const document = createDocument({
      variableIds: ['greeting'],
      header: {
        enabled: true,
        content: {
          type: 'doc',
          content: [{ type: 'injector', attrs: { variableId: 'greeting' } }],
        },
      },
    })

    const result = validateDocumentSemantics(document, { validateReferences: true })

    expect(result.warnings.filter((w) => w.code === 'UNDEFINED_VARIABLE')).toHaveLength(0)
  })

  it('warns when header injector references an undeclared variable', () => {
    const document = createDocument({
      variableIds: [],
      header: {
        enabled: true,
        content: {
          type: 'doc',
          content: [{ type: 'injector', attrs: { variableId: 'greeting' } }],
        },
      },
    })

    const result = validateDocumentSemantics(document, { validateReferences: true })

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNDEFINED_VARIABLE',
          path: 'header.content.content[0].attrs.variableId',
        }),
      ])
    )
  })

  it('getUsedVariableIds includes variable IDs from header text injectors', () => {
    const document = createDocument({
      content: { type: 'doc', content: [] },
      header: {
        enabled: true,
        content: {
          type: 'doc',
          content: [{ type: 'injector', attrs: { variableId: 'greeting' } }],
        },
      },
    })

    expect(getUsedVariableIds(document)).toEqual(['greeting'])
  })

  it('produces no warnings when header injector is declared in variableIds and exists in backend', () => {
    const document = createDocument({
      variableIds: ['greeting'],
      header: {
        enabled: true,
        content: {
          type: 'doc',
          content: [{ type: 'injector', attrs: { variableId: 'greeting' } }],
        },
      },
    })

    const backendVariables = [
      { id: '1', variableId: 'greeting', label: 'Greeting', type: 'TEXT' as const },
    ]

    const result = validateDocumentSemantics(document, {}, backendVariables)

    expect(result.warnings.filter((w) => w.code.includes('VARIABLE'))).toHaveLength(0)
  })

  it('getUsedVariableIds finds injectors in body and header simultaneously', () => {
    const document = createDocument({
      content: {
        type: 'doc',
        content: [{ type: 'injector', attrs: { variableId: 'name' } }],
      },
      header: {
        enabled: true,
        content: {
          type: 'doc',
          content: [{ type: 'injector', attrs: { variableId: 'greeting' } }],
        },
      },
    })

    const ids = getUsedVariableIds(document)
    expect(ids).toContain('name')
    expect(ids).toContain('greeting')
  })
})
