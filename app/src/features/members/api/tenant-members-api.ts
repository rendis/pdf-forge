import { apiClient } from '@/lib/api-client'
import type {
  TenantMember,
  TenantMemberListResponse,
  AddTenantMemberRequest,
  UpdateTenantMemberRoleRequest,
} from '../types'

const BASE_PATH = '/tenant/members'

export async function listTenantMembers(): Promise<TenantMember[]> {
  const response = await apiClient.get<TenantMemberListResponse>(BASE_PATH)
  return response.data.data
}

export async function addTenantMember(data: AddTenantMemberRequest): Promise<TenantMember> {
  const response = await apiClient.post<TenantMember>(BASE_PATH, data)
  return response.data
}

export async function updateTenantMemberRole(
  memberId: string,
  data: UpdateTenantMemberRoleRequest
): Promise<TenantMember> {
  const response = await apiClient.put<TenantMember>(`${BASE_PATH}/${memberId}`, data)
  return response.data
}

export async function removeTenantMember(memberId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${memberId}`)
}
