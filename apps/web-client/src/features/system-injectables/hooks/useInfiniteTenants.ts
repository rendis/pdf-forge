import { useInfiniteQuery } from '@tanstack/react-query'
import { listSystemTenants, type SystemTenant } from '../api/system-tenants-api'

const ITEMS_PER_PAGE = 10

export interface TenantItem {
  id: string
  name: string
  subtitle?: string
}

export function useInfiniteTenants(searchQuery: string) {
  return useInfiniteQuery({
    queryKey: ['infinite-tenants', searchQuery],
    queryFn: async ({ pageParam }) => {
      // Unified endpoint handles both list and search
      const result = await listSystemTenants(
        pageParam,
        ITEMS_PER_PAGE,
        searchQuery.length >= 3 ? searchQuery : undefined
      )
      return {
        items: result.data.map((t: SystemTenant) => ({
          id: t.id,
          name: t.name,
          subtitle: t.code,
        })),
        nextPage:
          result.pagination.page < result.pagination.totalPages
            ? result.pagination.page + 1
            : undefined,
        hasMore: result.pagination.page < result.pagination.totalPages,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  })
}
