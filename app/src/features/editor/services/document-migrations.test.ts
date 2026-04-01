import { describe, expect, it } from 'vitest'
import { getAvailableMigrations, migrateDocument, needsMigration } from './document-migrations'

const baseDocument = {
  version: '2.0.0',
  meta: { title: 'Doc', language: 'es' as const },
  pageConfig: {
    formatId: 'A4' as const,
    width: 794,
    height: 1123,
    margins: { top: 96, bottom: 96, left: 96, right: 96 },
  },
  variableIds: [],
  content: { type: 'doc' as const, content: [] },
  exportInfo: {
    exportedAt: new Date('2026-03-29T00:00:00.000Z').toISOString(),
    sourceApp: 'pdf-forge-test',
  },
}

describe('document-migrations', () => {
  it('exposes the 2.0.0 -> 2.1.0 migration and upgrades documents additively', () => {
    expect(getAvailableMigrations()).toEqual(['2.0.0'])
    expect(needsMigration(baseDocument)).toBe(true)

    const migrated = migrateDocument(baseDocument)

    expect(migrated.version).toBe('2.1.0')
    expect(migrated.header).toBeUndefined()
  })
})
