import apiClient from '@/lib/api-client'
import type { RoleEntry } from '@/stores/auth-store'

interface MyRolesResponse {
  roles: RoleEntry[]
}

/**
 * Get current user's roles
 */
export async function fetchMyRoles(): Promise<RoleEntry[]> {
  const response = await apiClient.get<MyRolesResponse>('/me/roles')
  return response.data.roles
}

/**
 * Record resource access (for analytics/audit)
 */
export async function recordAccess(
  entityType: 'TENANT' | 'WORKSPACE',
  entityId: string
): Promise<void> {
  await apiClient.post('/me/access', {
    entityType,
    entityId,
  })
}
