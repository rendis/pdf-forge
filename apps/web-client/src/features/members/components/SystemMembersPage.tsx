import { useTranslation } from 'react-i18next'
import { useSystemMembers, useAssignSystemRole, useRevokeSystemRole } from '../hooks/useSystemMembers'
import { MembersPage } from './MembersPage'
import type { MemberRow } from './MembersTable'
import type { SystemRoleAssignment } from '../types'

const ASSIGNABLE_ROLES = ['SUPERADMIN', 'PLATFORM_ADMIN']

function toMemberRow(item: SystemRoleAssignment): MemberRow {
  return {
    id: item.id,
    userId: item.userId,
    email: item.user?.email ?? '',
    fullName: item.user?.fullName ?? '',
    role: item.role,
    status: item.user?.status ?? 'ACTIVE',
  }
}

export function SystemMembersPage() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useSystemMembers()
  const assignRole = useAssignSystemRole()
  const revokeRole = useRevokeSystemRole()

  const members = (data ?? []).map(toMemberRow)

  return (
    <MembersPage
      label={t('members.system.label', 'System')}
      title={t('members.system.title', 'System Users')}
      description={t('members.system.description', 'Manage users with system-level roles.')}
      members={members}
      isLoading={isLoading}
      error={error}
      assignableRoles={ASSIGNABLE_ROLES}
      canAdd={true}
      canChangeRole={false}
      canRemove={true}
      onAdd={async (data) => {
        await assignRole.mutateAsync({ email: data.email, fullName: data.fullName, role: data.role })
      }}
      onRemove={async (userId) => {
        await revokeRole.mutateAsync(userId)
      }}
      removeByUserId={true}
    />
  )
}
