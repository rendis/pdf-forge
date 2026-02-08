import apiClient from '@/lib/api-client'
import type { TemplateListItem } from '@/types/api'

interface TemplatesListResponse {
  items: TemplateListItem[]
  total: number
  limit: number
}

/**
 * Fetch templates by folder ID
 * @param folderId - Folder ID or null for root folder
 */
export async function fetchTemplatesByFolder(
  folderId: string | null
): Promise<TemplatesListResponse> {
  const params = new URLSearchParams()
  params.set('folderId', folderId ?? 'root')

  const response = await apiClient.get<TemplatesListResponse>(
    `/content/templates?${params}`
  )
  return response.data
}

export interface MoveTemplateRequest {
  folderId: string | null
}

/**
 * Move template to a different folder
 * @param templateId - Template ID to move
 * @param data - Contains target folderId (null for root)
 */
export async function moveTemplate(
  templateId: string,
  data: MoveTemplateRequest
): Promise<TemplateListItem> {
  const response = await apiClient.put<TemplateListItem>(
    `/content/templates/${templateId}`,
    { folderId: data.folderId ?? 'root' }
  )
  return response.data
}
