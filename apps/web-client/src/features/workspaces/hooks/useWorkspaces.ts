import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getWorkspaces,
  createWorkspace,
  fetchCurrentWorkspace,
  updateCurrentWorkspace,
  updateWorkspaceStatus,
} from '../api/workspaces-api'
import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceStatus,
} from '../types'

export function useWorkspaces(
  tenantId: string | null,
  page = 1,
  perPage = 20,
  query?: string,
  status?: string
) {
  return useQuery({
    queryKey: ['workspaces', tenantId, page, perPage, query, status],
    queryFn: () => getWorkspaces(page, perPage, query, status),
    enabled: !!tenantId,
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
  })
}

export function useCurrentWorkspace() {
  return useQuery({
    queryKey: ['current-workspace'],
    queryFn: fetchCurrentWorkspace,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWorkspaceRequest) => createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateWorkspaceRequest) => updateCurrentWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-workspace'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateWorkspaceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkspaceStatus }) =>
      updateWorkspaceStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}
