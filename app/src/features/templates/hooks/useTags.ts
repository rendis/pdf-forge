import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTags, createTag, type CreateTagRequest } from '../api/tags-api'
import { useAppContextStore } from '@/stores/app-context-store'

export const tagKeys = {
  all: ['tags'] as const,
  list: (workspaceId?: string) => [...tagKeys.all, 'list', workspaceId] as const,
}

export function useTags() {
  const currentWorkspace = useAppContextStore((s) => s.currentWorkspace)
  return useQuery({
    queryKey: tagKeys.list(currentWorkspace?.id),
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000, // 5 min cache (tags don't change frequently)
    enabled: !!currentWorkspace,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTagRequest) => createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
    },
  })
}
