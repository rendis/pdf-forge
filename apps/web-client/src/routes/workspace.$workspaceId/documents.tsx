import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DocumentsPage } from '@/features/documents'

const documentsSearchSchema = z.object({
  folderId: z.string().optional(),
})

export const Route = createFileRoute('/workspace/$workspaceId/documents')({
  component: DocumentsPage,
  validateSearch: documentsSearchSchema,
})
