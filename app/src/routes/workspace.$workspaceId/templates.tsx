import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$workspaceId/templates')({
  component: TemplatesLayout,
})

function TemplatesLayout() {
  return <Outlet />
}
