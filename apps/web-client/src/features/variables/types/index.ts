// Workspace Injectable types based on Swagger API specification

export interface WorkspaceInjectable {
  id: string
  workspaceId: string
  key: string
  label: string
  defaultValue: string
  dataType: 'TEXT' // Currently only TEXT is supported
  description?: string
  sourceType: 'INTERNAL' | 'EXTERNAL'
  isActive: boolean
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ListWorkspaceInjectablesResponse {
  items: WorkspaceInjectable[]
}

export interface CreateWorkspaceInjectableRequest {
  key: string
  label: string
  defaultValue: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface UpdateWorkspaceInjectableRequest {
  key?: string
  label?: string
  defaultValue?: string
  description?: string
  metadata?: Record<string, unknown>
}
