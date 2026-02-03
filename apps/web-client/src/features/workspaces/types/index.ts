export type WorkspaceType = 'SYSTEM' | 'CLIENT'
export type WorkspaceStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export interface Workspace {
  id: string
  tenantId?: string
  code: string
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  createdAt: string
  updatedAt?: string
}

export interface WorkspaceWithRole extends Workspace {
  role: string
  lastAccessedAt?: string | null
}

export interface CreateWorkspaceRequest {
  code: string
  name: string
  type: WorkspaceType
}

export interface UpdateWorkspaceRequest {
  code?: string
  name?: string
}

export interface UpdateWorkspaceStatusRequest {
  status: WorkspaceStatus
}
