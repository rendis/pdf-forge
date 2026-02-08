import { createFileRoute } from '@tanstack/react-router'
import { useAppContextStore } from '@/stores/app-context-store'
import { SystemMembersPage, TenantMembersPage, WorkspaceMembersPage } from '@/features/members'

export const Route = createFileRoute('/workspace/$workspaceId/members')({
  component: MembersRoute,
})

function MembersRoute() {
  const { isGlobalSystemWorkspace, isTenantSystemWorkspace } = useAppContextStore()

  if (isGlobalSystemWorkspace()) {
    return <SystemMembersPage />
  }

  if (isTenantSystemWorkspace()) {
    return <TenantMembersPage />
  }

  return <WorkspaceMembersPage />
}
