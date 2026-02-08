import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  listSystemTenants,
  createTenant,
  updateTenant,
  updateTenantStatus,
  deleteTenant,
  type CreateTenantRequest,
  type UpdateTenantRequest,
  type TenantStatus,
} from '../api/system-tenants-api'

export const systemTenantsKeys = {
  all: ['system-tenants'] as const,
  list: (page: number, perPage: number, query?: string) =>
    [...systemTenantsKeys.all, 'list', page, perPage, query] as const,
}

export function useSystemTenants(page: number, perPage: number, query?: string) {
  return useQuery({
    queryKey: systemTenantsKeys.list(page, perPage, query),
    queryFn: () => listSystemTenants(page, perPage, query),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTenantRequest) => createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemTenantsKeys.all })
    },
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantRequest }) =>
      updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemTenantsKeys.all })
    },
  })
}

export function useUpdateTenantStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TenantStatus }) =>
      updateTenantStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemTenantsKeys.all })
    },
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemTenantsKeys.all })
    },
  })
}
