import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listWorkspaceInjectables,
  createWorkspaceInjectable,
  updateWorkspaceInjectable,
  deleteWorkspaceInjectable,
  activateWorkspaceInjectable,
  deactivateWorkspaceInjectable,
} from '../api/workspace-injectables-api'
import type { UpdateWorkspaceInjectableRequest } from '../types'

export const workspaceInjectableKeys = {
  all: ['workspace-injectables'] as const,
  lists: () => [...workspaceInjectableKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...workspaceInjectableKeys.lists(), workspaceId] as const,
}

function useInvalidateOnSuccess() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: workspaceInjectableKeys.all })
}

export function useWorkspaceInjectables(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceInjectableKeys.list(workspaceId ?? ''),
    queryFn: listWorkspaceInjectables,
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateWorkspaceInjectable() {
  const onSuccess = useInvalidateOnSuccess()
  return useMutation({
    mutationFn: createWorkspaceInjectable,
    onSuccess,
  })
}

export function useUpdateWorkspaceInjectable() {
  const onSuccess = useInvalidateOnSuccess()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceInjectableRequest }) =>
      updateWorkspaceInjectable(id, data),
    onSuccess,
  })
}

export function useDeleteWorkspaceInjectable() {
  const onSuccess = useInvalidateOnSuccess()
  return useMutation({
    mutationFn: deleteWorkspaceInjectable,
    onSuccess,
  })
}

export function useActivateWorkspaceInjectable() {
  const onSuccess = useInvalidateOnSuccess()
  return useMutation({
    mutationFn: activateWorkspaceInjectable,
    onSuccess,
  })
}

export function useDeactivateWorkspaceInjectable() {
  const onSuccess = useInvalidateOnSuccess()
  return useMutation({
    mutationFn: deactivateWorkspaceInjectable,
    onSuccess,
  })
}
