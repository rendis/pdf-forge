import { apiClient } from '@/lib/api-client'
import type {
  WorkspaceInjectable,
  ListWorkspaceInjectablesResponse,
  CreateWorkspaceInjectableRequest,
  UpdateWorkspaceInjectableRequest,
} from '../types'

const BASE_PATH = '/workspace/injectables'

export async function listWorkspaceInjectables(): Promise<WorkspaceInjectable[]> {
  const response = await apiClient.get<ListWorkspaceInjectablesResponse>(BASE_PATH)
  return response.data.items
}

export async function getWorkspaceInjectable(id: string): Promise<WorkspaceInjectable> {
  const response = await apiClient.get<WorkspaceInjectable>(`${BASE_PATH}/${id}`)
  return response.data
}

export async function createWorkspaceInjectable(
  data: CreateWorkspaceInjectableRequest
): Promise<WorkspaceInjectable> {
  const response = await apiClient.post<WorkspaceInjectable>(BASE_PATH, data)
  return response.data
}

export async function updateWorkspaceInjectable(
  id: string,
  data: UpdateWorkspaceInjectableRequest
): Promise<WorkspaceInjectable> {
  const response = await apiClient.put<WorkspaceInjectable>(`${BASE_PATH}/${id}`, data)
  return response.data
}

export async function deleteWorkspaceInjectable(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`)
}

export async function activateWorkspaceInjectable(id: string): Promise<WorkspaceInjectable> {
  const response = await apiClient.post<WorkspaceInjectable>(`${BASE_PATH}/${id}/activate`)
  return response.data
}

export async function deactivateWorkspaceInjectable(id: string): Promise<WorkspaceInjectable> {
  const response = await apiClient.post<WorkspaceInjectable>(`${BASE_PATH}/${id}/deactivate`)
  return response.data
}

export const workspaceInjectablesApi = {
  list: listWorkspaceInjectables,
  get: getWorkspaceInjectable,
  create: createWorkspaceInjectable,
  update: updateWorkspaceInjectable,
  delete: deleteWorkspaceInjectable,
  activate: activateWorkspaceInjectable,
  deactivate: deactivateWorkspaceInjectable,
}
