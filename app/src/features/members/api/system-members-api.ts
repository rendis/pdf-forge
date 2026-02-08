import { apiClient } from '@/lib/api-client'
import type {
  SystemRoleAssignment,
  SystemRoleListResponse,
  AssignSystemRoleByEmailRequest,
} from '../types'

const BASE_PATH = '/system/users'

export async function listSystemUsers(): Promise<SystemRoleAssignment[]> {
  const response = await apiClient.get<SystemRoleListResponse>(BASE_PATH)
  return response.data.data
}

export async function assignSystemRoleByEmail(
  data: AssignSystemRoleByEmailRequest
): Promise<SystemRoleAssignment> {
  const response = await apiClient.post<SystemRoleAssignment>(BASE_PATH, data)
  return response.data
}

export async function revokeSystemRole(userId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${userId}/role`)
}
