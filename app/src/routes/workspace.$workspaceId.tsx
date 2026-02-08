import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAppContextStore } from '@/stores/app-context-store'

export const Route = createFileRoute('/workspace/$workspaceId')({
  beforeLoad: () => {
    const { currentTenant } = useAppContextStore.getState()

    // If no tenant selected, redirect to select
    if (!currentTenant) {
      throw redirect({ to: '/select-tenant' })
    }
  },
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  return <AppLayout />
}
