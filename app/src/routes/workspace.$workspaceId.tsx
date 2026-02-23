import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAppContextStore } from '@/stores/app-context-store'

export const Route = createFileRoute('/workspace/$workspaceId')({
  beforeLoad: ({ params }) => {
    const { currentTenant, currentWorkspace, _hasHydrated } = useAppContextStore.getState()

    // Wait for Zustand persist to rehydrate from localStorage before checking context
    if (!_hasHydrated) {
      throw redirect({ to: '/select-tenant' })
    }

    // Redirect if tenant or workspace context is missing/mismatched
    if (!currentTenant || !currentWorkspace || currentWorkspace.id !== params.workspaceId) {
      throw redirect({ to: '/select-tenant' })
    }
  },
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  return <AppLayout />
}
