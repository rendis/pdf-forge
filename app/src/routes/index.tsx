import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useAppContextStore } from '@/stores/app-context-store'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { token } = useAuthStore.getState()
    const { currentWorkspace } = useAppContextStore.getState()

    // If not logged in, go to login
    if (!token) {
      throw redirect({ to: '/login' })
    }

    // If logged in but no workspace, go to select tenant
    if (!currentWorkspace) {
      throw redirect({ to: '/select-tenant' })
    }

    // If everything is set, go to templates
    throw redirect({
      to: '/workspace/$workspaceId/templates',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
      params: { workspaceId: currentWorkspace.id } as any,
    })
  },
  component: () => null,
})
