import { Paginator } from '@/components/ui/paginator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import type { SystemTenant, TenantStatus } from '@/features/system-injectables/api/system-tenants-api'
import {
  useSystemTenants,
  useUpdateTenantStatus,
} from '@/features/system-injectables/hooks/useSystemTenants'
import {
  AlertTriangle,
  Archive,
  Building2,
  ExternalLink,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { useAppContextStore } from '@/stores/app-context-store'
import type { TenantWithRole } from '@/features/tenants/types'
import { TenantFormDialog } from './TenantFormDialog'
import { TenantStatusBadge } from './TenantStatusBadge'
import { ArchiveTenantDialog } from './ArchiveTenantDialog'

const TH_CLASS =
  'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'
const ITEMS_PER_PAGE = 10
const DEBOUNCE_MS = 300

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TenantsTab(): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Dialog states
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedTenant, setSelectedTenant] = useState<SystemTenant | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const navigate = useNavigate()
  const { setCurrentTenant, setSingleTenant } = useAppContextStore()
  const updateStatusMutation = useUpdateTenantStatus()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery])

  const { data, isLoading, error, isFetching } = useSystemTenants(
    page,
    ITEMS_PER_PAGE,
    debouncedQuery.length >= 3 ? debouncedQuery : undefined
  )

  const tenants = data?.data ?? []
  const totalPages = data?.pagination?.totalPages ?? 1

  const handleCreate = () => {
    setSelectedTenant(null)
    setFormMode('create')
    setFormOpen(true)
  }

  const handleEdit = (tenant: SystemTenant) => {
    setSelectedTenant(tenant)
    setFormMode('edit')
    setFormOpen(true)
  }

  const handleStatusChange = async (tenant: SystemTenant, newStatus: TenantStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: tenant.id,
        status: newStatus,
      })
      toast({
        title: t('administration.tenants.statusUpdated', 'Status updated'),
      })
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('administration.tenants.statusError', 'Failed to update status'),
      })
    }
  }

  const handleArchive = (tenant: SystemTenant) => {
    setSelectedTenant(tenant)
    setArchiveOpen(true)
  }

  const handleOpenTenant = (tenant: SystemTenant) => {
    const tenantWithRole: TenantWithRole = {
      ...tenant,
      role: 'SUPERADMIN',
    }
    setSingleTenant(false)
    setCurrentTenant(tenantWithRole)
    navigate({ to: '/select-tenant', search: { intent: 'switch' } })
  }

  const getStatusAction = (tenant: SystemTenant) => {
    if (tenant.status === 'ACTIVE') {
      return {
        label: t('administration.tenants.actions.suspend', 'Suspend'),
        icon: Pause,
        onClick: () => handleStatusChange(tenant, 'SUSPENDED'),
      }
    }
    if (tenant.status === 'SUSPENDED') {
      return {
        label: t('administration.tenants.actions.activate', 'Activate'),
        icon: Play,
        onClick: () => handleStatusChange(tenant, 'ACTIVE'),
      }
    }
    // ARCHIVED
    return {
      label: t('administration.tenants.actions.activate', 'Activate'),
      icon: Play,
      onClick: () => handleStatusChange(tenant, 'ACTIVE'),
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t(
          'administration.tenants.description',
          'Manage tenant organizations and their configurations.'
        )}
      </p>

      {/* Search and Add button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="group relative w-full md:max-w-xs">
          <Search
            className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
            size={18}
          />
          <input
            type="text"
            placeholder={t('administration.tenants.searchPlaceholder', 'Search tenants...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-7 pr-4 text-sm font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
          />
          <p className={`absolute left-0 top-full pt-1 text-xs text-muted-foreground transition-opacity duration-200 ${searchQuery.length > 0 && searchQuery.length < 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {t('common.searchMinChars', 'Type at least 3 characters to search')}
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
        >
          <Plus size={14} />
          {t('administration.tenants.addTenant', 'Add Tenant')}
        </button>
      </div>

      <div className="rounded-sm border">
        {/* Loading State */}
        {isLoading && (
          <div className="divide-y">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertTriangle size={32} className="mb-3 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {t('administration.tenants.loadError', 'Failed to load tenants')}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && tenants.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Building2 size={32} className="mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {debouncedQuery.length >= 3
                ? t('administration.tenants.noResults', 'No tenants match your search')
                : t('administration.tenants.empty', 'No tenants found')}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && tenants.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className={`${TH_CLASS} w-[35%]`}>
                  {t('administration.tenants.columns.name', 'Name')}
                </th>
                <th className={`${TH_CLASS} w-[15%]`}>
                  {t('administration.tenants.columns.code', 'Code')}
                </th>
                <th className={`${TH_CLASS} w-[15%]`}>
                  {t('administration.tenants.columns.status', 'Status')}
                </th>
                <th className={`${TH_CLASS} w-[20%]`}>
                  {t('administration.tenants.columns.created', 'Created')}
                </th>
                <th className={`${TH_CLASS} w-[15%]`}></th>
              </tr>
            </thead>
            <tbody className={isFetching ? 'opacity-50' : undefined}>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="p-4">
                    <button
                      onClick={() => handleOpenTenant(tenant)}
                      className="font-medium hover:underline"
                    >
                      {tenant.name}
                    </button>
                    {tenant.isSystem && (
                      <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {t('administration.tenants.system', 'System')}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs uppercase">
                      {tenant.code}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-4">
                    <TenantStatusBadge status={tenant.status} />
                  </td>
                  <td className="whitespace-nowrap p-4 font-mono text-sm text-muted-foreground">
                    {formatDate(tenant.createdAt)}
                  </td>
                  <td className="p-4">
                    {!tenant.isSystem && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-sm p-1 hover:bg-muted">
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenTenant(tenant)}>
                            <ExternalLink size={14} className="mr-2" />
                            {t('administration.tenants.actions.open', 'Open')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                            <Pencil size={14} className="mr-2" />
                            {t('administration.tenants.actions.edit', 'Edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={getStatusAction(tenant).onClick}>
                            {(() => {
                              const action = getStatusAction(tenant)
                              const Icon = action.icon
                              return (
                                <>
                                  <Icon size={14} className="mr-2" />
                                  {action.label}
                                </>
                              )
                            })()}
                          </DropdownMenuItem>
                          {tenant.status !== 'ARCHIVED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleArchive(tenant)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Archive size={14} className="mr-2" />
                                {t('administration.tenants.actions.archive', 'Archive')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginator */}
      {!isLoading && !error && (
        <Paginator
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          disabled={isFetching}
          className="py-2"
        />
      )}

      {/* Dialogs */}
      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        tenant={selectedTenant}
      />

      <ArchiveTenantDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        tenant={selectedTenant}
      />
    </div>
  )
}
