// --- Common types ---

export type MemberLevel = 'system' | 'tenant' | 'workspace'

export interface UserBrief {
  id: string
  email: string
  fullName: string
  status: string
}

// --- System level ---

export interface SystemRoleAssignment {
  id: string
  userId: string
  role: string
  grantedBy?: string
  createdAt: string
  user: UserBrief | null
}

export interface SystemRoleListResponse {
  data: SystemRoleAssignment[]
  count: number
}

export interface AssignSystemRoleByEmailRequest {
  email: string
  fullName: string
  role: string
}

// --- Tenant level ---

export interface TenantMember {
  id: string
  tenantId: string
  role: string
  membershipStatus: string
  createdAt: string
  user: UserBrief | null
}

export interface TenantMemberListResponse {
  data: TenantMember[]
  count: number
}

export interface AddTenantMemberRequest {
  email: string
  fullName: string
  role: string
}

export interface UpdateTenantMemberRoleRequest {
  role: string
}

// --- Workspace level ---

export interface WorkspaceMember {
  id: string
  workspaceId: string
  role: string
  membershipStatus: string
  joinedAt?: string
  createdAt: string
  user: {
    id: string
    email: string
    fullName: string
    status: string
  } | null
}

export interface WorkspaceMemberListResponse {
  data: WorkspaceMember[]
  count: number
}

export interface InviteWorkspaceMemberRequest {
  email: string
  fullName: string
  role: string
}

export interface UpdateWorkspaceMemberRoleRequest {
  role: string
}
