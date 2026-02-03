import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSystemUsers,
  assignSystemRoleByEmail,
  revokeSystemRole,
} from '../api/system-members-api'
import type { AssignSystemRoleByEmailRequest } from '../types'

export const systemMemberKeys = {
  all: ['system-members'] as const,
  list: () => [...systemMemberKeys.all, 'list'] as const,
}

export function useSystemMembers() {
  return useQuery({
    queryKey: systemMemberKeys.list(),
    queryFn: listSystemUsers,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAssignSystemRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AssignSystemRoleByEmailRequest) => assignSystemRoleByEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemMemberKeys.all })
    },
  })
}

export function useRevokeSystemRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => revokeSystemRole(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemMemberKeys.all })
    },
  })
}
