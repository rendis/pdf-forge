import apiClient from '@/lib/api-client'

export interface TagWithCount {
  id: string
  name: string
  color: string
  templateCount: number
  workspaceId: string
  createdAt: string
  updatedAt: string
}

interface TagsListResponse {
  data: TagWithCount[]
  count: number
}

export async function fetchTags(): Promise<TagsListResponse> {
  const response = await apiClient.get<TagsListResponse>('/workspace/tags')
  return response.data
}

export interface CreateTagRequest {
  name: string
  color: string
}

export interface TagResponse {
  id: string
  name: string
  color: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export async function createTag(data: CreateTagRequest): Promise<TagResponse> {
  const response = await apiClient.post<TagResponse>('/workspace/tags', data)
  return response.data
}
