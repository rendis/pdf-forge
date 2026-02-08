import { apiClient } from '@/lib/api-client'
import type {
  WorkspaceMember,
  WorkspaceMemberListResponse,
  InviteWorkspaceMemberRequest,
  UpdateWorkspaceMemberRoleRequest,
} from '../types'

const BASE_PATH = '/workspace/members'

export async function listWorkspaceMembers(): Promise<WorkspaceMember[]> {
  const response = await apiClient.get<WorkspaceMemberListResponse>(BASE_PATH)
  return response.data.data
}

export async function inviteWorkspaceMember(
  data: InviteWorkspaceMemberRequest
): Promise<WorkspaceMember> {
  const response = await apiClient.post<WorkspaceMember>(BASE_PATH, data)
  return response.data
}

export async function updateWorkspaceMemberRole(
  memberId: string,
  data: UpdateWorkspaceMemberRoleRequest
): Promise<WorkspaceMember> {
  const response = await apiClient.put<WorkspaceMember>(`${BASE_PATH}/${memberId}`, data)
  return response.data
}

export async function removeWorkspaceMember(memberId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${memberId}`)
}
