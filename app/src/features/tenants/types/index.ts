export interface Tenant {
  id: string
  name: string
  code: string
  description?: string
  settings?: TenantSettings
  isSystem?: boolean
  createdAt: string
  updatedAt?: string
}

export interface TenantSettings {
  currency?: string
  timezone?: string
  dateFormat?: string
  locale?: string
}

export interface TenantWithRole extends Tenant {
  role: string
  lastAccessedAt?: string | null
}

export interface CreateTenantRequest {
  name: string
  code: string
  description?: string
}

export interface UpdateTenantRequest {
  name?: string
  description?: string
  settings?: TenantSettings
}
