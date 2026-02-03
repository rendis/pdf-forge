import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listWorkspaceMembers,
  inviteWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from '../api/workspace-members-api'
import type { InviteWorkspaceMemberRequest, UpdateWorkspaceMemberRoleRequest } from '../types'

export const workspaceMemberKeys = {
  all: ['workspace-members'] as const,
  list: () => [...workspaceMemberKeys.all, 'list'] as const,
}

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: workspaceMemberKeys.list(),
    queryFn: listWorkspaceMembers,
    staleTime: 2 * 60 * 1000,
  })
}

export function useInviteWorkspaceMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: InviteWorkspaceMemberRequest) => inviteWorkspaceMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.all })
    },
  })
}

export function useUpdateWorkspaceMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      memberId,
      data,
    }: {
      memberId: string
      data: UpdateWorkspaceMemberRoleRequest
    }) => updateWorkspaceMemberRole(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.all })
    },
  })
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeWorkspaceMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.all })
    },
  })
}
