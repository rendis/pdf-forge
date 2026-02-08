import apiClient, { type PaginatedResponse } from '@/lib/api-client'
import type { TenantWithRole, CreateTenantRequest, UpdateTenantRequest, Tenant } from '../types'

/**
 * Get tenants accessible by current user with optional search
 */
export async function getMyTenants(
  page = 1,
  perPage = 20,
  query?: string
): Promise<PaginatedResponse<TenantWithRole>> {
  const response = await apiClient.get<PaginatedResponse<TenantWithRole>>(
    '/me/tenants',
    { params: { page, perPage, ...(query && { q: query }) } }
  )
  return response.data
}

/**
 * Get current tenant (from context)
 */
export async function fetchCurrentTenant(): Promise<Tenant> {
  const response = await apiClient.get<Tenant>('/tenant')
  return response.data
}

/**
 * Update current tenant
 */
export async function updateCurrentTenant(
  data: UpdateTenantRequest
): Promise<Tenant> {
  const response = await apiClient.put<Tenant>('/tenant', data)
  return response.data
}

// Admin only endpoints
export async function fetchAllTenants(
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<Tenant>> {
  const response = await apiClient.get<PaginatedResponse<Tenant>>(
    '/system/tenants/list',
    { params: { page, perPage } }
  )
  return response.data
}

export async function createTenant(data: CreateTenantRequest): Promise<Tenant> {
  const response = await apiClient.post<Tenant>('/system/tenants', data)
  return response.data
}

export async function fetchTenant(tenantId: string): Promise<Tenant> {
  const response = await apiClient.get<Tenant>(`/system/tenants/${tenantId}`)
  return response.data
}
