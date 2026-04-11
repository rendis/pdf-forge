/**
 * Document Migrations Service
 *
 * Handles version migrations for PortableDocument format.
 */

import type { PortableDocument } from '../types/document-format'
import { DOCUMENT_FORMAT_VERSION } from '../types/document-format'

// =============================================================================
// Migration Registry
// =============================================================================

/**
 * Migration function type
 * Each migration transforms a document from version N to version N+1
 */
type MigrationFunction = (doc: PortableDocument) => PortableDocument

/**
 * Registry of all migrations
 * Key is the source version (version to migrate FROM)
 */
const migrations: Record<string, MigrationFunction> = {
  '2.0.0': migrateFrom_2_0_0_to_2_1_0,
  '2.1.0': migrateFrom_2_1_0_to_2_2_0,
}

// =============================================================================
// Migration Functions
// =============================================================================

// 2.0.0 → 2.1.0: header field added. No structural migration needed —
// old documents without header remain valid (field is optional).
// Version bump only; import code handles missing header via store reset.
function migrateFrom_2_0_0_to_2_1_0(doc: PortableDocument): PortableDocument {
  return { ...doc }
}

// 2.1.0 → 2.2.0: footer field added. No structural migration needed —
// old documents without footer remain valid (field is optional).
function migrateFrom_2_1_0_to_2_2_0(doc: PortableDocument): PortableDocument {
  return { ...doc }
}

/**
 * Migrates a document to the current version
 * Applies all necessary migrations in sequence
 */
export function migrateDocument(document: PortableDocument): PortableDocument {
  // If already at current version, no migration needed
  if (document.version === DOCUMENT_FORMAT_VERSION) {
    return document
  }

  let currentDoc = { ...document }

  for (;;) {
    const migrate = migrations[currentDoc.version]
    if (!migrate) break
    currentDoc = migrate(currentDoc)
    currentDoc.version = getNextVersion(currentDoc.version)
  }

  return currentDoc
}

/**
 * Gets the next version number for a given version
 * This is a simplified version - in real implementation would use semver library
 */
function getNextVersion(version: string): string {
  switch (version) {
    case '2.0.0':
      return '2.1.0'
    case '2.1.0':
      return '2.2.0'
    default:
      return version
  }
}

/**
 * Checks if a document needs migration
 */
export function needsMigration(document: PortableDocument): boolean {
  return document.version !== DOCUMENT_FORMAT_VERSION
}

/**
 * Gets a list of available migrations
 */
export function getAvailableMigrations(): string[] {
  return Object.keys(migrations).sort()
}
