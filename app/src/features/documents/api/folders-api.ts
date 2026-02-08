import apiClient from '@/lib/api-client'
import type {
  Folder,
  FolderTree,
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
} from '@/types/api'

interface ListResponse<T> {
  count: number
  data: T[]
}

/**
 * List all folders in current workspace (flat list)
 */
export async function fetchFolders(): Promise<ListResponse<Folder>> {
  const response = await apiClient.get<ListResponse<Folder>>('/workspace/folders')
  return response.data
}

/**
 * Get folder tree (hierarchical structure)
 */
export async function fetchFolderTree(): Promise<FolderTree[]> {
  const response = await apiClient.get<FolderTree[]>('/workspace/folders/tree')
  return response.data
}

/**
 * Create new folder
 */
export async function createFolder(data: CreateFolderRequest): Promise<Folder> {
  const response = await apiClient.post<Folder>('/workspace/folders', data)
  return response.data
}

/**
 * Update folder name
 */
export async function updateFolder(
  folderId: string,
  data: UpdateFolderRequest
): Promise<Folder> {
  const response = await apiClient.put<Folder>(`/workspace/folders/${folderId}`, data)
  return response.data
}

/**
 * Delete folder
 */
export async function deleteFolder(folderId: string): Promise<void> {
  await apiClient.delete(`/workspace/folders/${folderId}`)
}

/**
 * Move folder to new parent
 */
export async function moveFolder(
  folderId: string,
  data: MoveFolderRequest
): Promise<Folder> {
  const response = await apiClient.patch<Folder>(
    `/workspace/folders/${folderId}/move`,
    { newParentId: data.parentId }
  )
  return response.data
}

/**
 * Batch delete folders (client-side orchestration)
 */
export async function deleteFolders(folderIds: string[]): Promise<void> {
  await Promise.all(folderIds.map((id) => deleteFolder(id)))
}

/**
 * Batch move folders (client-side orchestration)
 */
export async function moveFolders(
  folderIds: string[],
  newParentId: string | null
): Promise<Folder[]> {
  const results = await Promise.all(
    folderIds.map((id) => moveFolder(id, { parentId: newParentId }))
  )
  return results
}
