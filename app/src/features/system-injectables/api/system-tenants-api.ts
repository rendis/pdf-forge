import { apiClient } from '@/lib/api-client'

// Types for system tenants API
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export interface SystemTenant {
  id: string
  name: string
  code: string
  description?: string
  isSystem: boolean
  status: TenantStatus
  createdAt: string
  updatedAt?: string
}

export interface TenantWorkspace {
  id: string
  name: string
  type: string
  status: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ListTenantsResponse {
  data: SystemTenant[]
  pagination: PaginationMeta
}

export interface ListWorkspacesResponse {
  data: TenantWorkspace[]
  pagination: PaginationMeta
}

// System Tenants API (requires SUPERADMIN)
// GET /api/v1/system/tenants - List with pagination and optional search
export async function listSystemTenants(
  page = 1,
  perPage = 10,
  query?: string
): Promise<ListTenantsResponse> {
  const response = await apiClient.get<ListTenantsResponse>('/system/tenants', {
    params: { page, perPage, ...(query && { q: query }) },
  })
  return response.data
}

// GET /api/v1/system/tenants/{tenantId}/workspaces - List with pagination and optional search
export async function listTenantWorkspaces(
  tenantId: string,
  page = 1,
  perPage = 10,
  query?: string
): Promise<ListWorkspacesResponse> {
  const response = await apiClient.get<ListWorkspacesResponse>(
    `/system/tenants/${tenantId}/workspaces`,
    { params: { page, perPage, ...(query && { q: query }) } }
  )
  return response.data
}

// Create/Update/Delete API functions

export interface CreateTenantRequest {
  name: string
  code: string
  description?: string
}

export interface UpdateTenantRequest {
  name: string
  description?: string
}

// POST /api/v1/system/tenants - Create tenant
export async function createTenant(data: CreateTenantRequest): Promise<SystemTenant> {
  const response = await apiClient.post<SystemTenant>('/system/tenants', data)
  return response.data
}

// PUT /api/v1/system/tenants/{tenantId} - Update tenant
export async function updateTenant(
  tenantId: string,
  data: UpdateTenantRequest
): Promise<SystemTenant> {
  const response = await apiClient.put<SystemTenant>(`/system/tenants/${tenantId}`, data)
  return response.data
}

// PATCH /api/v1/system/tenants/{tenantId}/status - Update tenant status
export async function updateTenantStatus(
  tenantId: string,
  status: TenantStatus
): Promise<SystemTenant> {
  const response = await apiClient.patch<SystemTenant>(
    `/system/tenants/${tenantId}/status`,
    { status }
  )
  return response.data
}

// DELETE /api/v1/system/tenants/{tenantId} - Delete tenant
export async function deleteTenant(tenantId: string): Promise<void> {
  await apiClient.delete(`/system/tenants/${tenantId}`)
}
