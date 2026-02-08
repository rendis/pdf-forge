import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTemplatesByFolder, moveTemplate } from '../api/templates-api'

// Query keys factory
export const templateKeys = {
  all: ['templates'] as const,
  byFolder: (folderId: string | null) =>
    [...templateKeys.all, 'byFolder', folderId ?? 'root'] as const,
}

/**
 * Hook to fetch templates by folder ID
 * @param folderId - Folder ID or null for root folder
 */
export function useTemplatesByFolder(folderId: string | null) {
  return useQuery({
    queryKey: templateKeys.byFolder(folderId),
    queryFn: () => fetchTemplatesByFolder(folderId),
    staleTime: 0,
    gcTime: 0,
  })
}

/**
 * Hook to move a template to a different folder
 */
export function useMoveTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      folderId,
    }: {
      templateId: string
      folderId: string | null
    }) => moveTemplate(templateId, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}
