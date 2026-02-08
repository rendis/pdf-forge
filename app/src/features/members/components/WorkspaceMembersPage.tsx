import { useTranslation } from 'react-i18next'
import { usePermission } from '@/features/auth/hooks/usePermission'
import {
  useWorkspaceMembers,
  useInviteWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useRemoveWorkspaceMember,
} from '../hooks/useWorkspaceMembers'
import { MembersPage } from './MembersPage'
import type { MemberRow } from './MembersTable'
import type { WorkspaceMember } from '../types'

const ASSIGNABLE_ROLES = ['ADMIN', 'EDITOR', 'OPERATOR', 'VIEWER']

function toMemberRow(item: WorkspaceMember): MemberRow {
  return {
    id: item.id,
    userId: item.user?.id ?? '',
    email: item.user?.email ?? '',
    fullName: item.user?.fullName ?? '',
    role: item.role,
    status: item.user?.status ?? item.membershipStatus,
  }
}

export function WorkspaceMembersPage() {
  const { t } = useTranslation()
  const { hasPermission, Permission } = usePermission()
  const { data, isLoading, error } = useWorkspaceMembers()
  const inviteMember = useInviteWorkspaceMember()
  const updateRole = useUpdateWorkspaceMemberRole()
  const removeMember = useRemoveWorkspaceMember()

  const members = (data ?? []).map(toMemberRow)

  const canAdd = hasPermission(Permission.MEMBERS_INVITE)
  const canChangeRole = hasPermission(Permission.MEMBERS_UPDATE_ROLE)
  const canRemove = hasPermission(Permission.MEMBERS_REMOVE)

  return (
    <MembersPage
      label={t('members.workspace.label', 'Workspace')}
      title={t('members.workspace.title', 'Members')}
      description={t('members.workspace.description', 'Manage workspace members and their roles.')}
      members={members}
      isLoading={isLoading}
      error={error}
      assignableRoles={ASSIGNABLE_ROLES}
      canAdd={canAdd}
      canChangeRole={canChangeRole}
      canRemove={canRemove}
      onAdd={async (data) => {
        await inviteMember.mutateAsync({ email: data.email, fullName: data.fullName, role: data.role })
      }}
      onChangeRole={async (memberId, newRole) => {
        await updateRole.mutateAsync({ memberId, data: { role: newRole } })
      }}
      onRemove={async (memberId) => {
        await removeMember.mutateAsync(memberId)
      }}
    />
  )
}
