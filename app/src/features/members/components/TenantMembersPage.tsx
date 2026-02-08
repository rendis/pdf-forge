import { useTranslation } from 'react-i18next'
import {
  useTenantMembers,
  useAddTenantMember,
  useUpdateTenantMemberRole,
  useRemoveTenantMember,
} from '../hooks/useTenantMembers'
import { MembersPage } from './MembersPage'
import type { MemberRow } from './MembersTable'
import type { TenantMember } from '../types'

const ASSIGNABLE_ROLES = ['TENANT_OWNER', 'TENANT_ADMIN']

function toMemberRow(item: TenantMember): MemberRow {
  return {
    id: item.id,
    userId: item.user?.id ?? '',
    email: item.user?.email ?? '',
    fullName: item.user?.fullName ?? '',
    role: item.role,
    status: item.user?.status ?? item.membershipStatus,
  }
}

export function TenantMembersPage() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useTenantMembers()
  const addMember = useAddTenantMember()
  const updateRole = useUpdateTenantMemberRole()
  const removeMember = useRemoveTenantMember()

  const members = (data ?? []).map(toMemberRow)

  return (
    <MembersPage
      label={t('members.tenant.label', 'Tenant')}
      title={t('members.tenant.title', 'Tenant Members')}
      description={t('members.tenant.description', 'Manage members of this organization.')}
      members={members}
      isLoading={isLoading}
      error={error}
      assignableRoles={ASSIGNABLE_ROLES}
      canAdd={true}
      canChangeRole={true}
      canRemove={true}
      onAdd={async (data) => {
        await addMember.mutateAsync({ email: data.email, fullName: data.fullName, role: data.role })
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
