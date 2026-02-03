// System Injectable types based on Swagger API specification

// API types for scope
export type ApiScopeType = 'PUBLIC' | 'TENANT' | 'WORKSPACE'

export interface SystemInjectable {
  key: string
  label: Record<string, string>
  description: Record<string, string>
  dataType: string
  isActive: boolean
  isPublic: boolean
}

export interface SystemInjectableAssignment {
  id: string
  injectableKey: string
  scopeType: ApiScopeType
  tenantId?: string
  tenantName?: string
  workspaceId?: string
  workspaceName?: string
  isActive: boolean
  createdAt: string
}

// UI type for grouped assignments by tenant
export interface TenantGroup {
  tenantId: string
  tenantName: string
  tenantAssignment: SystemInjectableAssignment | null
  workspaceAssignments: SystemInjectableAssignment[]
}

export interface ListSystemInjectablesResponse {
  injectables: SystemInjectable[]
}

export interface ListAssignmentsResponse {
  assignments: SystemInjectableAssignment[]
}

export interface CreateAssignmentRequest {
  scopeType: ApiScopeType
  tenantId?: string
  workspaceId?: string
}

// Bulk operations types
export interface BulkKeysRequest {
  keys: string[]
}

export interface BulkScopedAssignmentsRequest {
  keys: string[]
  scopeType: ApiScopeType
  tenantId?: string
  workspaceId?: string
}

export interface BulkOperationError {
  key: string
  error: string
}

export interface BulkOperationResponse {
  succeeded: string[]
  failed: BulkOperationError[]
}

// UI helper types
export type AssignmentScope = 'tenant' | 'workspace'
export type AssignmentMode = 'include' | 'exclude'

export interface SelectedScope {
  id: string
  name: string
}

export interface AssignmentWithDetails extends SystemInjectableAssignment {
  scopeName?: string
}
