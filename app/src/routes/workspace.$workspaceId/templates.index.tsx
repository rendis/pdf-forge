import { createFileRoute } from '@tanstack/react-router'
import { TemplatesPage } from '@/features/templates'

export const Route = createFileRoute('/workspace/$workspaceId/templates/')({
  component: TemplatesPage,
})
