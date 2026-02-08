import apiClient from '@/lib/api-client'
import type {
    CreateTemplateRequest,
    CreateVersionFromExistingRequest,
    CreateVersionRequest,
    TemplateCreateResponse,
    TemplateListItem,
    TemplateVersionResponse,
    TemplateWithAllVersionsResponse,
    UpdateTemplateRequest,
} from '@/types/api'
// Version types (from local types)
import type {
    TemplateVersionDetail,
    UpdateVersionRequest,
} from '../types'

export interface TemplatesListParams {
  search?: string
  hasPublishedVersion?: boolean
  tagIds?: string[]
  limit?: number
  offset?: number
}

export interface TemplatesListResponse {
  items: TemplateListItem[]
  total: number
  limit: number
  offset: number
}

export async function fetchTemplates(
  params: TemplatesListParams = {}
): Promise<TemplatesListResponse> {
  const searchParams = new URLSearchParams()

  if (params.search) searchParams.set('search', params.search)
  if (params.hasPublishedVersion !== undefined) {
    searchParams.set('hasPublishedVersion', String(params.hasPublishedVersion))
  }
  if (params.tagIds?.length) {
    searchParams.set('tagIds', params.tagIds.join(','))
  }
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  const response = await apiClient.get<TemplatesListResponse>(
    `/content/templates${query ? `?${query}` : ''}`
  )
  return response.data
}

export async function createTemplate(
  data: CreateTemplateRequest
): Promise<TemplateCreateResponse> {
  const response = await apiClient.post<TemplateCreateResponse>(
    '/content/templates',
    data
  )
  return response.data
}

export interface AddTagsToTemplateRequest {
  tagIds: string[]
}

export async function addTagsToTemplate(
  templateId: string,
  tagIds: string[]
): Promise<void> {
  if (tagIds.length === 0) return
  await apiClient.post<void>(`/content/templates/${templateId}/tags`, {
    tagIds,
  })
}

export async function updateTemplate(
  templateId: string,
  data: UpdateTemplateRequest
): Promise<void> {
  await apiClient.put<void>(`/content/templates/${templateId}`, data)
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await apiClient.delete<void>(`/content/templates/${templateId}`)
}

export async function removeTagFromTemplate(
  templateId: string,
  tagId: string
): Promise<void> {
  await apiClient.delete<void>(`/content/templates/${templateId}/tags/${tagId}`)
}

export interface AssignDocumentTypeRequest {
  documentTypeId: string | null
  force?: boolean
}

export interface DocumentTypeConflict {
  id: string
  title: string
}

export interface AssignDocumentTypeResponse {
  template?: {
    id: string
    title: string
    workspaceId: string
    folderId?: string
    isPublicLibrary: boolean
    createdAt: string
    updatedAt?: string
  }
  conflict?: DocumentTypeConflict
}

export class DocumentTypeConflictError extends Error {
  conflict: DocumentTypeConflict

  constructor(conflict: DocumentTypeConflict) {
    super('Document type is already assigned to another template')
    this.name = 'DocumentTypeConflictError'
    this.conflict = conflict
  }
}

export async function assignDocumentType(
  templateId: string,
  data: AssignDocumentTypeRequest
): Promise<AssignDocumentTypeResponse> {
  const response = await apiClient.put<AssignDocumentTypeResponse>(
    `/content/templates/${templateId}/document-type`,
    data
  )
  // If response has conflict and no template, throw a conflict error
  if (response.data.conflict && !response.data.template) {
    throw new DocumentTypeConflictError(response.data.conflict)
  }
  return response.data
}

// ============================================
// Template Detail & Versions API
// ============================================

export async function fetchTemplateWithVersions(
  templateId: string
): Promise<TemplateWithAllVersionsResponse> {
  const response = await apiClient.get<TemplateWithAllVersionsResponse>(
    `/content/templates/${templateId}/all-versions`
  )
  return response.data
}

export async function createVersion(
  templateId: string,
  data: CreateVersionRequest
): Promise<TemplateVersionResponse> {
  const response = await apiClient.post<TemplateVersionResponse>(
    `/content/templates/${templateId}/versions`,
    data
  )
  return response.data
}

export async function createVersionFromExisting(
  templateId: string,
  data: CreateVersionFromExistingRequest
): Promise<TemplateVersionResponse> {
  const response = await apiClient.post<TemplateVersionResponse>(
    `/content/templates/${templateId}/versions/from-existing`,
    data
  )
  return response.data
}

export async function updateVersion(
  templateId: string,
  versionId: string,
  data: UpdateVersionRequest
): Promise<TemplateVersionResponse> {
  const response = await apiClient.put<TemplateVersionResponse>(
    `/content/templates/${templateId}/versions/${versionId}`,
    data
  )
  return response.data
}

// ============================================
// Versions API (calcar v1)
// ============================================

/**
 * Obtiene detalle de una versión.
 * GET /api/v1/content/templates/{templateId}/versions/{versionId}
 */
export async function fetchVersion(
  templateId: string,
  versionId: string
): Promise<TemplateVersionDetail> {
  const response = await apiClient.get<TemplateVersionDetail>(
    `/content/templates/${templateId}/versions/${versionId}`
  )
  return response.data
}

/**
 * Versions API object (calcar v1 structure)
 * Provides version-related API methods
 */
export const versionsApi = {
  /**
   * Obtiene detalle de una versión.
   * GET /api/v1/content/templates/{templateId}/versions/{versionId}
   */
  get: async (templateId: string, versionId: string): Promise<TemplateVersionDetail> => {
    const response = await apiClient.get<TemplateVersionDetail>(
      `/content/templates/${templateId}/versions/${versionId}`
    )
    return response.data
  },

  /**
   * Actualiza una versión.
   * PUT /api/v1/content/templates/{templateId}/versions/{versionId}
   */
  update: async (
    templateId: string,
    versionId: string,
    data: UpdateVersionRequest
  ): Promise<TemplateVersionResponse> => {
    const response = await apiClient.put<TemplateVersionResponse>(
      `/content/templates/${templateId}/versions/${versionId}`,
      data
    )
    return response.data
  },

  /**
   * Publica una versión inmediatamente.
   * POST /api/v1/content/templates/{templateId}/versions/{versionId}/publish
   */
  publish: async (templateId: string, versionId: string): Promise<void> => {
    await apiClient.post(`/content/templates/${templateId}/versions/${versionId}/publish`)
  },

  /**
   * Programa la publicación de una versión.
   * POST /api/v1/content/templates/{templateId}/versions/{versionId}/schedule-publish
   */
  schedulePublish: async (
    templateId: string,
    versionId: string,
    publishAt: string
  ): Promise<void> => {
    await apiClient.post(
      `/content/templates/${templateId}/versions/${versionId}/schedule-publish`,
      { publishAt }
    )
  },

  /**
   * Cancela una acción programada (publicación o archivo).
   * DELETE /api/v1/content/templates/{templateId}/versions/{versionId}/schedule
   */
  cancelSchedule: async (templateId: string, versionId: string): Promise<void> => {
    await apiClient.delete(`/content/templates/${templateId}/versions/${versionId}/schedule`)
  },

  /**
   * Archiva una versión publicada.
   * POST /api/v1/content/templates/{templateId}/versions/{versionId}/archive
   */
  archive: async (templateId: string, versionId: string): Promise<void> => {
    await apiClient.post(`/content/templates/${templateId}/versions/${versionId}/archive`)
  },

  /**
   * Elimina una versión (solo DRAFT).
   * DELETE /api/v1/content/templates/{templateId}/versions/{versionId}
   */
  delete: async (templateId: string, versionId: string): Promise<void> => {
    await apiClient.delete(`/content/templates/${templateId}/versions/${versionId}`)
  },
}

