// Version status (reusing TemplateStatus)
export type VersionStatus = TemplateStatus;

// Import PortableDocument type for contentStructure
import type { PortableDocument } from '@/features/editor/types/document-format'

// ============================================================================
// Template Types
// ============================================================================

export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Template {
  id: string
  name: string
  description?: string
  status: TemplateStatus
  version: string
  folderId?: string
  tags: string[]
  author: {
    id: string
    name: string
    initials: string
    isCurrentUser?: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface TemplateVersion {
  id: string
  templateId: string
  version: string
  content: string
  createdAt: string
  createdBy: string
}

export interface TemplateFolder {
  id: string
  name: string
  parentId?: string
  createdAt: string
}

export interface TemplateTag {
  id: string
  name: string
  color?: string
}

// ============================================================================
// Version Types (calcar v1)
// ============================================================================

export interface TemplateVersionDetail {
  id: string
  templateId: string
  versionNumber: number
  name: string
  description?: string
  status: VersionStatus
  contentStructure?: Record<string, unknown>
  injectables?: TemplateVersionInjectable[]
  publishedAt?: string
  publishedBy?: string
  scheduledPublishAt?: string
  scheduledArchiveAt?: string
  archivedAt?: string
  archivedBy?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface TemplateVersionInjectable {
  id: string
  templateVersionId: string
  definition: Injectable
  isRequired: boolean
  defaultValue?: string
  createdAt: string
}

export interface Injectable {
  id: string
  workspaceId: string
  key: string
  label: Record<string, string>
  dataType: InjectableDataType
  description?: Record<string, string>
  isGlobal: boolean
  createdAt: string
  updatedAt?: string
}

export type InjectableDataType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE';

export interface UpdateVersionRequest {
  name?: string
  description?: string
  contentStructure?: PortableDocument
}
