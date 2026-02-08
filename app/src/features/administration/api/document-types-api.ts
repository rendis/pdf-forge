import { apiClient } from '@/lib/api-client'

// Types
export interface DocumentType {
  id: string
  tenantId: string
  code: string
  name: Record<string, string>
  description: Record<string, string>
  isGlobal: boolean // True if from SYS tenant (read-only for other tenants)
  templatesCount?: number
  createdAt: string
  updatedAt?: string
}

export interface DocumentTypeTemplateInfo {
  id: string
  title: string
  workspaceId: string
  workspaceName: string
}

export interface CreateDocumentTypeRequest {
  code: string
  name: Record<string, string>
  description?: Record<string, string>
}

export interface UpdateDocumentTypeRequest {
  name: Record<string, string>
  description?: Record<string, string>
}

export interface DeleteDocumentTypeRequest {
  force?: boolean
  replaceWithId?: string
}

export interface DeleteDocumentTypeResponse {
  deleted: boolean
  templates: DocumentTypeTemplateInfo[]
  canReplace: boolean
}

interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ListDocumentTypesResponse {
  data: DocumentType[]
  pagination: PaginationMeta
}

const BASE_PATH = '/tenant/document-types'

export async function listDocumentTypes(
  page = 1,
  perPage = 10,
  query?: string
): Promise<ListDocumentTypesResponse> {
  const response = await apiClient.get<ListDocumentTypesResponse>(BASE_PATH, {
    params: { page, perPage, ...(query && { q: query }) },
  })
  return response.data
}

export async function getDocumentType(id: string): Promise<DocumentType> {
  const response = await apiClient.get<DocumentType>(`${BASE_PATH}/${id}`)
  return response.data
}

export async function getDocumentTypeByCode(code: string): Promise<DocumentType> {
  const response = await apiClient.get<DocumentType>(`${BASE_PATH}/code/${code}`)
  return response.data
}

export async function getTemplatesByDocumentTypeCode(
  code: string
): Promise<{ data: DocumentTypeTemplateInfo[] }> {
  const response = await apiClient.get<{ data: DocumentTypeTemplateInfo[] }>(
    `${BASE_PATH}/code/${code}/templates`
  )
  return response.data
}

export async function createDocumentType(
  data: CreateDocumentTypeRequest
): Promise<DocumentType> {
  const response = await apiClient.post<DocumentType>(BASE_PATH, data)
  return response.data
}

export async function updateDocumentType(
  id: string,
  data: UpdateDocumentTypeRequest
): Promise<DocumentType> {
  const response = await apiClient.put<DocumentType>(`${BASE_PATH}/${id}`, data)
  return response.data
}

export async function deleteDocumentType(
  id: string,
  options?: DeleteDocumentTypeRequest
): Promise<DeleteDocumentTypeResponse> {
  const response = await apiClient.delete<DeleteDocumentTypeResponse>(
    `${BASE_PATH}/${id}`,
    { data: options }
  )
  return response.data
}
