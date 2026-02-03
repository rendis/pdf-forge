import { useQuery } from '@tanstack/react-query'
import { getMyTenants } from '../api/tenants-api'

export function useMyTenants(page = 1, perPage = 20, query?: string) {
  return useQuery({
    queryKey: ['my-tenants', page, perPage, query],
    queryFn: () => getMyTenants(page, perPage, query),
    staleTime: 0,
    gcTime: 0,
  })
}
