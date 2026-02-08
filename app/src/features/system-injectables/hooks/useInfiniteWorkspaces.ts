import { useInfiniteQuery } from '@tanstack/react-query'
import { listTenantWorkspaces, type TenantWorkspace } from '../api/system-tenants-api'

const ITEMS_PER_PAGE = 10

export interface WorkspaceItem {
  id: string
  name: string
  subtitle?: string
}

export function useInfiniteWorkspaces(tenantId: string | null, searchQuery: string) {
  return useInfiniteQuery({
    queryKey: ['infinite-workspaces', tenantId, searchQuery],
    queryFn: async ({ pageParam }) => {
      if (!tenantId) {
        return { items: [], nextPage: undefined, hasMore: false }
      }

      // Unified endpoint handles both list and search
      const result = await listTenantWorkspaces(
        tenantId,
        pageParam,
        ITEMS_PER_PAGE,
        searchQuery.length >= 3 ? searchQuery : undefined
      )
      return {
        items: result.data.map((w: TenantWorkspace) => ({
          id: w.id,
          name: w.name,
          subtitle: w.type,
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
    enabled: !!tenantId,
  })
}
