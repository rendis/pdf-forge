import { TemplateVersionDetail } from './types'

export type VersionState = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED'

/**
 * Determines the logical state of a version.
 * This handles derived states like 'SCHEDULED' which might technically be 'DRAFT' in the database
 * but have a scheduled date.
 */
export function getVersionState(version: TemplateVersionDetail | null): VersionState {
  if (!version) return 'DRAFT'

  if (version.status === 'PUBLISHED') return 'PUBLISHED'
  if (version.status === 'ARCHIVED') return 'ARCHIVED'
  
  // If it's DRAFT but has a scheduled publish date, treat it as SCHEDULED
  if (version.scheduledPublishAt) return 'SCHEDULED'
  
  return 'DRAFT'
}

/**
 * Determines if a version is editable based on its state.
 * Only 'DRAFT' state is editable.
 */
export function isVersionEditable(version: TemplateVersionDetail | null): boolean {
  const state = getVersionState(version)
  return state === 'DRAFT'
}
