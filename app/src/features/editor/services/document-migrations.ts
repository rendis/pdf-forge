/**
 * Document Migrations Service
 *
 * Handles version migrations for PortableDocument format.
 * Currently at v1.1.0, this provides placeholder for future migrations.
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
  // Future migrations will be added here
  // Example:
  // '1.0.0': migrateFrom_1_0_0_to_1_1_0,
}

// =============================================================================
// Migration Functions
// =============================================================================

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

  // Apply migrations in sequence
  // This will be expanded when we have actual migrations
  const versions = Object.keys(migrations).sort()
  for (const version of versions) {
    if (currentDoc.version === version) {
      currentDoc = migrations[version](currentDoc)
      currentDoc.version = getNextVersion(version)
    }
  }

  return currentDoc
}

/**
 * Gets the next version number for a given version
 * This is a simplified version - in real implementation would use semver library
 */
function getNextVersion(version: string): string {
  const parts = version.split('.').map(Number)
  // Increment patch version
  parts[2] = (parts[2] ?? 0) + 1
  return parts.join('.')
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
