import { Button } from '@/components/ui/button'
import {
  Dialog,
  BaseDialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Globe,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateAssignment, useExcludeAssignment } from '../hooks/useSystemInjectables'
import { useInfiniteTenants, type TenantItem } from '../hooks/useInfiniteTenants'
import { useInfiniteWorkspaces, type WorkspaceItem } from '../hooks/useInfiniteWorkspaces'
import type { ApiScopeType, AssignmentMode, SelectedScope } from '../types'

interface CreateAssignmentDialogProps {
  injectableKey: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Inline component: InfiniteScrollSentinel
function InfiniteScrollSentinel({
  onIntersect,
  isLoading,
  hasMore,
}: {
  onIntersect: () => void
  isLoading: boolean
  hasMore: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onIntersect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [onIntersect, hasMore, isLoading])

  if (!hasMore) return null

  return (
    <div ref={ref} className="flex items-center justify-center p-3">
      {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
    </div>
  )
}

// Inline component: TenantBreadcrumb
function TenantBreadcrumb({
  tenant,
  onBack,
}: {
  tenant: SelectedScope
  onBack: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onBack}
      className="group flex w-full items-center gap-2 border-b border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
    >
      <ChevronLeft
        size={16}
        className="text-muted-foreground transition-transform group-hover:-translate-x-0.5"
      />
      <Building2 size={16} className="text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{tenant.name}</span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        {t('systemInjectables.change', 'Change')}
      </span>
    </button>
  )
}

// Inline component: SelectableList
function SelectableList({
  items,
  selectedId,
  onSelect,
  showArrow = false,
  isLoading,
  hasMore,
  onLoadMore,
  emptyMessage,
}: {
  items: Array<{ id: string; name: string; subtitle?: string }>
  selectedId: string | null
  onSelect: (id: string, name: string) => void
  showArrow?: boolean
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  emptyMessage: string
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  if (!isLoading && items.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center border border-border">
        <span className="text-sm text-muted-foreground">{emptyMessage}</span>
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className="max-h-[240px] overflow-y-auto border border-border"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id, item.name)}
          className={cn(
            'flex w-full items-center justify-between border-b border-border p-3 text-left transition-colors last:border-b-0',
            selectedId === item.id ? 'bg-muted/50' : 'hover:bg-muted/30'
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{item.name}</div>
            {item.subtitle && (
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {item.subtitle}
              </div>
            )}
          </div>
          {showArrow ? (
            <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
          ) : (
            selectedId === item.id && <Check size={16} className="shrink-0 text-foreground" />
          )}
        </button>
      ))}
      <InfiniteScrollSentinel
        onIntersect={onLoadMore}
        isLoading={isLoading}
        hasMore={hasMore}
      />
      {isLoading && items.length === 0 && (
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export function CreateAssignmentDialog({
  injectableKey,
  open,
  onOpenChange,
}: CreateAssignmentDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const [scopeType, setScopeType] = useState<ApiScopeType>('TENANT')
  const [selectedTenant, setSelectedTenant] = useState<SelectedScope | null>(null)
  const [selectedWorkspace, setSelectedWorkspace] = useState<SelectedScope | null>(null)
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('include')

  // Panel navigation state for WORKSPACE mode
  const [activePanel, setActivePanel] = useState<'tenant' | 'workspace'>('tenant')

  // Track previous non-PUBLIC scope for collapse animation
  const [collapsingFrom, setCollapsingFrom] = useState<'TENANT' | 'WORKSPACE' | null>(null)

  // Search states
  const [tenantSearch, setTenantSearch] = useState('')
  const [workspaceSearch, setWorkspaceSearch] = useState('')

  // Infinite queries
  const tenantsQuery = useInfiniteTenants(tenantSearch)
  const workspacesQuery = useInfiniteWorkspaces(selectedTenant?.id ?? null, workspaceSearch)

  // Flatten items from infinite query pages
  const tenantItems: TenantItem[] =
    tenantsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const workspaceItems: WorkspaceItem[] =
    workspacesQuery.data?.pages.flatMap((page) => page.items) ?? []

  const createMutation = useCreateAssignment(injectableKey)
  const excludeMutation = useExcludeAssignment(injectableKey)

  const isValid =
    scopeType === 'PUBLIC' ||
    (scopeType === 'TENANT' && selectedTenant) ||
    (scopeType === 'WORKSPACE' && selectedTenant && selectedWorkspace)

  const isPending = createMutation.isPending || excludeMutation.isPending

  // Reset all state when dialog closes
  useEffect(() => {
    if (!open) {
      setScopeType('TENANT')
      setSelectedTenant(null)
      setSelectedWorkspace(null)
      setAssignmentMode('include')
      setActivePanel('tenant')
      setCollapsingFrom(null)
      setTenantSearch('')
      setWorkspaceSearch('')
    }
  }, [open])

  // Reset search when panel changes
  useEffect(() => {
    if (activePanel === 'tenant') {
      setWorkspaceSearch('')
    }
  }, [activePanel])

  // Clear collapsingFrom after animation completes
  useEffect(() => {
    if (collapsingFrom) {
      const timer = setTimeout(() => {
        setCollapsingFrom(null)
      }, 300) // Match the duration-300 transition
      return () => clearTimeout(timer)
    }
  }, [collapsingFrom])

  function handleScopeTypeChange(type: ApiScopeType) {
    // Track which panel we're collapsing from for animation
    if (type === 'PUBLIC' && scopeType !== 'PUBLIC') {
      setCollapsingFrom(scopeType)
    } else {
      setCollapsingFrom(null)
    }

    setScopeType(type)
    setActivePanel('tenant')
    setSelectedTenant(null)
    setSelectedWorkspace(null)
    setTenantSearch('')
    setWorkspaceSearch('')
  }

  function handleTenantSelect(id: string, name: string) {
    setSelectedTenant({ id, name })
    if (scopeType === 'WORKSPACE') {
      setActivePanel('workspace')
    }
  }

  function handleWorkspaceSelect(id: string, name: string) {
    setSelectedWorkspace({ id, name })
  }

  function handleBackToTenant() {
    setActivePanel('tenant')
    setSelectedWorkspace(null)
    setWorkspaceSearch('')
  }

  const handleFetchMoreTenants = useCallback(() => {
    if (tenantsQuery.hasNextPage && !tenantsQuery.isFetchingNextPage) {
      tenantsQuery.fetchNextPage()
    }
  }, [tenantsQuery])

  const handleFetchMoreWorkspaces = useCallback(() => {
    if (workspacesQuery.hasNextPage && !workspacesQuery.isFetchingNextPage) {
      workspacesQuery.fetchNextPage()
    }
  }, [workspacesQuery])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    const data = {
      scopeType,
      ...(scopeType !== 'PUBLIC' && selectedTenant && { tenantId: selectedTenant.id }),
      ...(scopeType === 'WORKSPACE' && selectedWorkspace && { workspaceId: selectedWorkspace.id }),
    }

    try {
      const assignment = await createMutation.mutateAsync(data)

      if (assignmentMode === 'exclude') {
        await excludeMutation.mutateAsync(assignment.id)
      }

      handleClose()
    } catch {
      // Error is handled by the mutation
    }
  }

  function handleClose() {
    onOpenChange(false)
    // Reset state
    setScopeType('TENANT')
    setSelectedTenant(null)
    setSelectedWorkspace(null)
    setAssignmentMode('include')
    setActivePanel('tenant')
    setCollapsingFrom(null)
    setTenantSearch('')
    setWorkspaceSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-6">
            <div>
              <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest">
                {t('systemInjectables.createAssignment', 'Create Assignment')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {t(
                  'systemInjectables.createAssignmentDesc',
                  'Assign this injectable to a specific scope'
                )}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
            {/* Scope Type */}
            <div className="space-y-3">
              <label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('systemInjectables.scopeType', 'Scope Type')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleScopeTypeChange('PUBLIC')}
                  className={cn(
                    'flex items-center gap-2 rounded-sm border px-3 py-2 transition-colors',
                    scopeType === 'PUBLIC'
                      ? 'border-foreground bg-muted/50'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <Globe size={16} className="shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t('systemInjectables.public', 'Public')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeTypeChange('TENANT')}
                  className={cn(
                    'flex items-center gap-2 rounded-sm border px-3 py-2 transition-colors',
                    scopeType === 'TENANT'
                      ? 'border-foreground bg-muted/50'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <Building2 size={16} className="shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t('systemInjectables.tenant', 'Tenant')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeTypeChange('WORKSPACE')}
                  className={cn(
                    'flex items-center gap-2 rounded-sm border px-3 py-2 transition-colors',
                    scopeType === 'WORKSPACE'
                      ? 'border-foreground bg-muted/50'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <FolderOpen size={16} className="shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t('systemInjectables.workspace', 'Workspace')}
                  </span>
                </button>
              </div>
            </div>

            {/* Assignment Mode - Compact inline selector */}
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('systemInjectables.assignmentMode', 'Assignment Mode')}
              </label>
              <div className="flex items-center gap-1 rounded-sm border border-border p-1">
                <button
                  type="button"
                  onClick={() => setAssignmentMode('include')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                    assignmentMode === 'include'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      assignmentMode === 'include' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )}
                  />
                  {t('systemInjectables.include', 'Include')}
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode('exclude')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                    assignmentMode === 'exclude'
                      ? 'bg-rose-500/10 text-rose-600'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      assignmentMode === 'exclude' ? 'bg-rose-500' : 'bg-muted-foreground/30'
                    )}
                  />
                  {t('systemInjectables.exclude', 'Exclude')}
                </button>
              </div>
            </div>

            {/* Scope Selection Panel - Animated height container */}
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                scopeType === 'PUBLIC' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
              )}
            >
              <div className="relative min-h-[340px] overflow-hidden">
                {/* Scope Selection - TENANT mode */}
                <div
                  className={cn(
                    'space-y-3 transition-opacity duration-200',
                    scopeType === 'TENANT' || collapsingFrom === 'TENANT'
                      ? 'relative'
                      : 'pointer-events-none absolute inset-x-0 top-0',
                    scopeType === 'TENANT' ? 'opacity-100' : 'opacity-0'
                  )}
                  aria-hidden={scopeType !== 'TENANT'}
                >
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      {t('systemInjectables.selectTenant', 'Select Tenant')}
                    </label>
                    {selectedTenant && (
                      <span className="font-mono text-[10px] text-foreground">
                        {selectedTenant.name}
                      </span>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                    />
                    <input
                      type="text"
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      placeholder={t('systemInjectables.searchTenants', 'Search organizations...')}
                      className="w-full border-b border-border bg-transparent py-2 pl-6 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-foreground"
                    />
                    {tenantSearch.length > 0 && tenantSearch.length < 3 && (
                      <span className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground">
                        {t('systemInjectables.minChars', 'Type at least 3 characters')}
                      </span>
                    )}
                  </div>

                  <SelectableList
                    items={tenantItems}
                    selectedId={selectedTenant?.id ?? null}
                    onSelect={handleTenantSelect}
                    showArrow={false}
                    isLoading={tenantsQuery.isLoading || tenantsQuery.isFetchingNextPage}
                    hasMore={tenantsQuery.hasNextPage ?? false}
                    onLoadMore={handleFetchMoreTenants}
                    emptyMessage={t('systemInjectables.noTenants', 'No organizations found')}
                  />
                </div>

                {/* Scope Selection - WORKSPACE mode with sliding panels */}
                <div
                  className={cn(
                    'relative overflow-hidden transition-opacity duration-200',
                    scopeType === 'WORKSPACE' || collapsingFrom === 'WORKSPACE'
                      ? 'relative'
                      : 'pointer-events-none absolute inset-x-0 top-0',
                    scopeType === 'WORKSPACE' ? 'opacity-100' : 'opacity-0'
                  )}
                  aria-hidden={scopeType !== 'WORKSPACE'}
                >
                {/* Sliding panels container */}
                <div className="relative">
                {/* Panel 1: Tenant Selection */}
                <div
                  className={cn(
                    'space-y-3 transition-all duration-200 ease-out',
                    activePanel === 'tenant'
                      ? 'relative translate-x-0 opacity-100'
                      : 'absolute inset-x-0 top-0 -translate-x-full opacity-0 pointer-events-none'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      {t('systemInjectables.selectOrganization', 'Select Organization')}
                    </label>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {t('systemInjectables.stepOf', 'Step {{current}} of {{total}}', {
                        current: 1,
                        total: 2,
                      })}
                    </span>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                    />
                    <input
                      type="text"
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      placeholder={t('systemInjectables.searchTenants', 'Search organizations...')}
                      className="w-full border-b border-border bg-transparent py-2 pl-6 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-foreground"
                    />
                    {tenantSearch.length > 0 && tenantSearch.length < 3 && (
                      <span className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground">
                        {t('systemInjectables.minChars', 'Type at least 3 characters')}
                      </span>
                    )}
                  </div>

                  <SelectableList
                    items={tenantItems}
                    selectedId={null}
                    onSelect={handleTenantSelect}
                    showArrow={true}
                    isLoading={tenantsQuery.isLoading || tenantsQuery.isFetchingNextPage}
                    hasMore={tenantsQuery.hasNextPage ?? false}
                    onLoadMore={handleFetchMoreTenants}
                    emptyMessage={t('systemInjectables.noTenants', 'No organizations found')}
                  />
                </div>

                {/* Panel 2: Workspace Selection */}
                <div
                  className={cn(
                    'space-y-3 transition-all duration-200 ease-out',
                    activePanel === 'workspace'
                      ? 'relative translate-x-0 opacity-100'
                      : 'absolute inset-x-0 top-0 translate-x-full opacity-0 pointer-events-none'
                  )}
                >
                  {/* Tenant Breadcrumb */}
                  {selectedTenant && (
                    <TenantBreadcrumb tenant={selectedTenant} onBack={handleBackToTenant} />
                  )}

                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      {t('systemInjectables.selectWorkspace', 'Select Workspace')}
                    </label>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {t('systemInjectables.stepOf', 'Step {{current}} of {{total}}', {
                        current: 2,
                        total: 2,
                      })}
                    </span>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                    />
                    <input
                      type="text"
                      value={workspaceSearch}
                      onChange={(e) => setWorkspaceSearch(e.target.value)}
                      placeholder={t('systemInjectables.searchWorkspaces', 'Search workspaces...')}
                      className="w-full border-b border-border bg-transparent py-2 pl-6 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-foreground"
                    />
                    {workspaceSearch.length > 0 && workspaceSearch.length < 3 && (
                      <span className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground">
                        {t('systemInjectables.minChars', 'Type at least 3 characters')}
                      </span>
                    )}
                  </div>

                  <SelectableList
                    items={workspaceItems}
                    selectedId={selectedWorkspace?.id ?? null}
                    onSelect={handleWorkspaceSelect}
                    showArrow={false}
                    isLoading={workspacesQuery.isLoading || workspacesQuery.isFetchingNextPage}
                    hasMore={workspacesQuery.hasNextPage ?? false}
                    onLoadMore={handleFetchMoreWorkspaces}
                    emptyMessage={t('systemInjectables.noWorkspaces', 'No workspaces found')}
                  />
                </div>
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="rounded-none font-mono text-xs uppercase"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isPending}
              className={cn(
                'rounded-none font-mono text-xs uppercase',
                assignmentMode === 'include'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              )}
            >
              {isPending
                ? t('common.saving', 'Saving...')
                : assignmentMode === 'include'
                  ? t('systemInjectables.addInclusion', 'Add Inclusion')
                  : t('systemInjectables.addExclusion', 'Add Exclusion')}
            </Button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
