import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listTenantMembers,
  addTenantMember,
  updateTenantMemberRole,
  removeTenantMember,
} from '../api/tenant-members-api'
import type { AddTenantMemberRequest, UpdateTenantMemberRoleRequest } from '../types'

export const tenantMemberKeys = {
  all: ['tenant-members'] as const,
  list: () => [...tenantMemberKeys.all, 'list'] as const,
}

export function useTenantMembers() {
  return useQuery({
    queryKey: tenantMemberKeys.list(),
    queryFn: listTenantMembers,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAddTenantMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AddTenantMemberRequest) => addTenantMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantMemberKeys.all })
    },
  })
}

export function useUpdateTenantMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateTenantMemberRoleRequest }) =>
      updateTenantMemberRole(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantMemberKeys.all })
    },
  })
}

export function useRemoveTenantMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeTenantMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantMemberKeys.all })
    },
  })
}
