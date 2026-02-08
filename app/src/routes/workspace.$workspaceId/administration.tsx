import { AdministrationPage } from '@/features/administration'
import { useAppContextStore } from '@/stores/app-context-store'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$workspaceId/administration')({
  beforeLoad: () => {
    const { isSystemContext } = useAppContextStore.getState()
    if (!isSystemContext()) {
      throw redirect({ to: '/workspace/$workspaceId' })
    }
  },
  component: AdministrationPage,
})
