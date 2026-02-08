import { apiClient } from '@/lib/api-client'
import type {
  SystemInjectable,
  SystemInjectableAssignment,
  ListSystemInjectablesResponse,
  ListAssignmentsResponse,
  CreateAssignmentRequest,
  BulkOperationResponse,
  BulkScopedAssignmentsRequest,
} from '../types'

const BASE_PATH = '/system/injectables'

// List all system injectables
export async function listSystemInjectables(): Promise<SystemInjectable[]> {
  const response = await apiClient.get<ListSystemInjectablesResponse>(BASE_PATH)
  return response.data.injectables
}

// Activate a system injectable globally
export async function activateSystemInjectable(key: string): Promise<void> {
  await apiClient.patch(`${BASE_PATH}/${key}/activate`)
}

// Deactivate a system injectable globally
export async function deactivateSystemInjectable(key: string): Promise<void> {
  await apiClient.patch(`${BASE_PATH}/${key}/deactivate`)
}

// List assignments for a specific injectable
export async function listInjectableAssignments(
  key: string
): Promise<SystemInjectableAssignment[]> {
  const response = await apiClient.get<ListAssignmentsResponse>(
    `${BASE_PATH}/${key}/assignments`
  )
  return response.data.assignments
}

// Create a new assignment for an injectable
export async function createAssignment(
  key: string,
  data: CreateAssignmentRequest
): Promise<SystemInjectableAssignment> {
  const response = await apiClient.post<SystemInjectableAssignment>(
    `${BASE_PATH}/${key}/assignments`,
    data
  )
  return response.data
}

// Delete an assignment
export async function deleteAssignment(key: string, assignmentId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${key}/assignments/${assignmentId}`)
}

// Exclude an assignment (set is_active = false)
export async function excludeAssignment(
  key: string,
  assignmentId: string
): Promise<SystemInjectableAssignment> {
  const response = await apiClient.patch<SystemInjectableAssignment>(
    `${BASE_PATH}/${key}/assignments/${assignmentId}/exclude`
  )
  return response.data
}

// Include an assignment (set is_active = true)
export async function includeAssignment(
  key: string,
  assignmentId: string
): Promise<SystemInjectableAssignment> {
  const response = await apiClient.patch<SystemInjectableAssignment>(
    `${BASE_PATH}/${key}/assignments/${assignmentId}/include`
  )
  return response.data
}

// Bulk activate multiple system injectables
export async function bulkActivate(keys: string[]): Promise<BulkOperationResponse> {
  const response = await apiClient.patch<BulkOperationResponse>(
    `${BASE_PATH}/bulk/activate`,
    { keys }
  )
  return response.data
}

// Bulk deactivate multiple system injectables
export async function bulkDeactivate(keys: string[]): Promise<BulkOperationResponse> {
  const response = await apiClient.patch<BulkOperationResponse>(
    `${BASE_PATH}/bulk/deactivate`,
    { keys }
  )
  return response.data
}

// Bulk create scoped assignments for multiple keys
export async function bulkCreateAssignments(
  req: BulkScopedAssignmentsRequest
): Promise<BulkOperationResponse> {
  const response = await apiClient.post<BulkOperationResponse>(
    `${BASE_PATH}/bulk/assignments`,
    req
  )
  return response.data
}

// Bulk delete scoped assignments for multiple keys
export async function bulkDeleteAssignments(
  req: BulkScopedAssignmentsRequest
): Promise<BulkOperationResponse> {
  const response = await apiClient.delete<BulkOperationResponse>(
    `${BASE_PATH}/bulk/assignments`,
    { data: req }
  )
  return response.data
}

export const systemInjectablesApi = {
  list: listSystemInjectables,
  activate: activateSystemInjectable,
  deactivate: deactivateSystemInjectable,
  listAssignments: listInjectableAssignments,
  createAssignment,
  deleteAssignment,
  excludeAssignment,
  includeAssignment,
  bulkActivate,
  bulkDeactivate,
  bulkCreateAssignments,
  bulkDeleteAssignments,
}
