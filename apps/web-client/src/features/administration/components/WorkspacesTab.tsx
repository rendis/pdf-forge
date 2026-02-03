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
import type { Workspace, WorkspaceStatus } from '@/features/workspaces/types'
import {
  useWorkspaces,
  useUpdateWorkspaceStatus,
} from '@/features/workspaces/hooks/useWorkspaces'
import { useAppContextStore } from '@/stores/app-context-store'
import {
  AlertTriangle,
  Archive,
  Briefcase,
  ChevronDown,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { WorkspaceStatusBadge } from './WorkspaceStatusBadge'
import { WorkspaceFormDialog } from './WorkspaceFormDialog'
import { ArchiveWorkspaceDialog } from './ArchiveWorkspaceDialog'

const TH_CLASS =
  'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'
const ITEMS_PER_PAGE = 10
const DEBOUNCE_MS = 300

const STATUS_OPTIONS: Array<{ value: string; labelKey: string; fallback: string }> = [
  { value: '', labelKey: 'administration.workspaces.filter.allStatuses', fallback: 'All Statuses' },
  { value: 'ACTIVE', labelKey: 'administration.workspaces.filter.active', fallback: 'Active' },
  { value: 'SUSPENDED', labelKey: 'administration.workspaces.filter.suspended', fallback: 'Suspended' },
  { value: 'ARCHIVED', labelKey: 'administration.workspaces.filter.archived', fallback: 'Archived' },
]

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// --- Animated Row Component ---

interface WorkspaceRowProps {
  workspace: Workspace
  index: number
  isEntering: boolean
  isFilterAnimating: boolean
  onEdit: (ws: Workspace) => void
  onArchive: (ws: Workspace) => void
  getStatusAction: (ws: Workspace) => { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; onClick: () => void }
  t: (key: string, fallback?: string) => string
}

function WorkspaceRow({
  workspace,
  index,
  isEntering,
  isFilterAnimating,
  onEdit,
  onArchive,
  getStatusAction,
  t,
}: WorkspaceRowProps) {
  const shouldAnimate = index < 10
  const staggerDelay = shouldAnimate ? index * 0.05 : 0

  const getInitialState = () => {
    if (isEntering && shouldAnimate) {
      return { opacity: 0, x: 50 }
    }
    if (isFilterAnimating && shouldAnimate) {
      return { opacity: 0, x: 20 }
    }
    return { opacity: 1, x: 0 }
  }

  const action = getStatusAction(workspace)
  const StatusIcon = action.icon

  return (
    <motion.tr
      initial={getInitialState()}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: isFilterAnimating ? 0.15 : 0.2,
        ease: 'easeOut',
        delay: (isEntering || isFilterAnimating) ? staggerDelay : 0,
      }}
      className="border-b last:border-0 hover:bg-muted/50"
      style={{ overflow: 'hidden' }}
    >
      <td className="p-4">
        <span className="font-medium">{workspace.name}</span>
      </td>
      <td className="p-4">
        <span className="inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs uppercase">
          {workspace.code}
        </span>
      </td>
      <td className="whitespace-nowrap p-4">
        <WorkspaceStatusBadge status={workspace.status} />
      </td>
      <td className="whitespace-nowrap p-4 font-mono text-sm text-muted-foreground">
        {formatDate(workspace.createdAt)}
      </td>
      <td className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-sm p-1 hover:bg-muted">
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(workspace)}>
              <Pencil size={14} className="mr-2" />
              {t('administration.workspaces.actions.edit', 'Edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={action.onClick}>
              <StatusIcon size={14} className="mr-2" />
              {action.label}
            </DropdownMenuItem>
            {workspace.status !== 'ARCHIVED' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onArchive(workspace)}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive size={14} className="mr-2" />
                  {t('administration.workspaces.actions.archive', 'Archive')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  )
}

// --- Main Component ---

export function WorkspacesTab(): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { currentTenant } = useAppContextStore()

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

  // Animation states
  const [isEntering, setIsEntering] = useState(true)
  const [filterAnimationKey, setFilterAnimationKey] = useState(0)
  const prevResultsRef = useRef<string | null>(null)

  // Dialog states
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const updateStatusMutation = useUpdateWorkspaceStatus()

  // Enter animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when search or status filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, statusFilter])

  const { data, isLoading, error, isFetching } = useWorkspaces(
    currentTenant?.id ?? null,
    page,
    ITEMS_PER_PAGE,
    debouncedQuery.length >= 3 ? debouncedQuery : undefined,
    statusFilter || undefined
  )

  const totalPages = data?.pagination?.totalPages ?? 1

  // Filter out SYSTEM workspaces - only show CLIENT workspaces
  const clientWorkspaces = useMemo(
    () => (data?.data ?? []).filter((w) => w.type === 'CLIENT'),
    [data?.data]
  )

  // Detect result changes and trigger filter animation
  useEffect(() => {
    const currentResultsKey = clientWorkspaces.map((w) => w.id).join(',')
    if (clientWorkspaces.length > 0 && prevResultsRef.current !== currentResultsKey) {
      if (prevResultsRef.current !== null && !isEntering) {
        setFilterAnimationKey((k) => k + 1)
      }
    }
    prevResultsRef.current = currentResultsKey
  }, [clientWorkspaces, isEntering])

  const handleCreate = () => {
    setSelectedWorkspace(null)
    setFormMode('create')
    setFormOpen(true)
  }

  const handleEdit = (workspace: Workspace) => {
    setSelectedWorkspace(workspace)
    setFormMode('edit')
    setFormOpen(true)
  }

  const handleStatusChange = async (workspace: Workspace, newStatus: WorkspaceStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: workspace.id,
        status: newStatus,
      })
      toast({
        title: t('administration.workspaces.statusUpdated', 'Status updated'),
      })
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('administration.workspaces.statusError', 'Failed to update status'),
      })
    }
  }

  const handleArchive = (workspace: Workspace) => {
    setSelectedWorkspace(workspace)
    setArchiveOpen(true)
  }

  const getStatusAction = (workspace: Workspace) => {
    if (workspace.status === 'ACTIVE') {
      return {
        label: t('administration.workspaces.actions.suspend', 'Suspend'),
        icon: Pause,
        onClick: () => handleStatusChange(workspace, 'SUSPENDED'),
      }
    }
    if (workspace.status === 'SUSPENDED') {
      return {
        label: t('administration.workspaces.actions.activate', 'Activate'),
        icon: Play,
        onClick: () => handleStatusChange(workspace, 'ACTIVE'),
      }
    }
    // ARCHIVED
    return {
      label: t('administration.workspaces.actions.activate', 'Activate'),
      icon: Play,
      onClick: () => handleStatusChange(workspace, 'ACTIVE'),
    }
  }

  const selectedStatusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t(
          'administration.workspaces.description',
          'Manage workspaces for this tenant.'
        )}
      </p>

      {/* Search, Status Filter, and Add button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search */}
          <div className="group relative w-full md:max-w-xs">
            <Search
              className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder={t('administration.workspaces.searchPlaceholder', 'Search workspaces...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-7 pr-4 text-sm font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
            />
            <p className={`absolute left-0 top-full whitespace-nowrap pt-1 text-xs text-muted-foreground transition-opacity duration-200 ${searchQuery.length > 0 && searchQuery.length < 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {t('common.searchMinChars', 'Type at least 3 characters to search')}
            </p>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-sm border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              {selectedStatusLabel
                ? t(selectedStatusLabel.labelKey, selectedStatusLabel.fallback)
                : t('administration.workspaces.filter.allStatuses', 'All Statuses')}
              <ChevronDown
                size={16}
                className={`transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {statusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setStatusDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-sm border border-border bg-popover py-1 shadow-md">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setStatusFilter(option.value)
                        setStatusDropdownOpen(false)
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        statusFilter === option.value ? 'font-medium text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {t(option.labelKey, option.fallback)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
        >
          <Plus size={14} />
          {t('administration.workspaces.addWorkspace', 'Add Workspace')}
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
              {t('administration.workspaces.loadError', 'Failed to load workspaces')}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && clientWorkspaces.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Briefcase size={32} className="mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {debouncedQuery.length >= 3 || statusFilter
                ? t('administration.workspaces.noResults', 'No workspaces match your search')
                : t('administration.workspaces.empty', 'No workspaces found')}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && clientWorkspaces.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className={`${TH_CLASS} w-[30%]`}>
                  {t('administration.workspaces.columns.name', 'Name')}
                </th>
                <th className={`${TH_CLASS} w-[15%]`}>
                  {t('administration.workspaces.columns.code', 'Code')}
                </th>
                <th className={`${TH_CLASS} w-[15%]`}>
                  {t('administration.workspaces.columns.status', 'Status')}
                </th>
                <th className={`${TH_CLASS} w-[25%]`}>
                  {t('administration.workspaces.columns.created', 'Created')}
                </th>
                <th className={`${TH_CLASS} w-[15%]`}></th>
              </tr>
            </thead>
            <tbody>
              {clientWorkspaces.map((workspace, index) => (
                <WorkspaceRow
                  key={`${workspace.id}-${filterAnimationKey}`}
                  workspace={workspace}
                  index={index}
                  isEntering={isEntering || filterAnimationKey > 0}
                  isFilterAnimating={filterAnimationKey > 0}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  getStatusAction={getStatusAction}
                  t={t}
                />
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
      <WorkspaceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        workspace={selectedWorkspace}
      />

      <ArchiveWorkspaceDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        workspace={selectedWorkspace}
      />
    </div>
  )
}
