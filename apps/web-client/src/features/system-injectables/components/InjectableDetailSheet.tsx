import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  Building2,
  ChevronRight,
  FolderOpen,
  Globe,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useActivateSystemInjectable,
  useDeactivateSystemInjectable,
  useDeleteAssignment,
  useExcludeAssignment,
  useIncludeAssignment,
  useInjectableAssignments,
} from '../hooks/useSystemInjectables'
import type { SystemInjectable, SystemInjectableAssignment, TenantGroup } from '../types'
import { CreateAssignmentDialog } from './CreateAssignmentDialog'

const WORKSPACES_PER_PAGE = 7

interface InjectableDetailSheetProps {
  injectable: SystemInjectable | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
}

// Group assignments by tenant
function groupAssignmentsByTenant(
  assignments: SystemInjectableAssignment[]
): { publicAssignment: SystemInjectableAssignment | null; tenantGroups: TenantGroup[] } {
  const publicAssignment = assignments.find((a) => a.scopeType === 'PUBLIC') || null
  const tenantMap = new Map<string, TenantGroup>()

  for (const assignment of assignments) {
    if (assignment.scopeType === 'PUBLIC') continue

    const tenantId = assignment.tenantId!
    const tenantName = assignment.tenantName || tenantId.slice(0, 8)

    if (!tenantMap.has(tenantId)) {
      tenantMap.set(tenantId, {
        tenantId,
        tenantName,
        tenantAssignment: null,
        workspaceAssignments: [],
      })
    }

    const group = tenantMap.get(tenantId)!

    if (assignment.scopeType === 'TENANT') {
      group.tenantAssignment = assignment
    } else {
      group.workspaceAssignments.push(assignment)
    }
  }

  // Sort workspaces by name within each group
  for (const group of tenantMap.values()) {
    group.workspaceAssignments.sort((a, b) =>
      (a.workspaceName || '').localeCompare(b.workspaceName || '')
    )
  }

  // Sort tenant groups by name
  const tenantGroups = Array.from(tenantMap.values()).sort((a, b) =>
    a.tenantName.localeCompare(b.tenantName)
  )

  return { publicAssignment, tenantGroups }
}

// Filter groups by search query
function filterGroups(groups: TenantGroup[], searchQuery: string): TenantGroup[] {
  if (!searchQuery.trim()) return groups

  const query = searchQuery.toLowerCase()

  return groups
    .map((group) => {
      const tenantMatches = group.tenantName.toLowerCase().includes(query)
      const matchingWorkspaces = group.workspaceAssignments.filter((ws) =>
        ws.workspaceName?.toLowerCase().includes(query)
      )

      if (tenantMatches) {
        return group
      }

      if (matchingWorkspaces.length > 0) {
        return {
          ...group,
          workspaceAssignments: matchingWorkspaces,
        }
      }

      return null
    })
    .filter((g): g is TenantGroup => g !== null)
}

export function InjectableDetailSheet({
  injectable,
  open,
  onOpenChange,
  canManage,
}: InjectableDetailSheetProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null)

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setExpandedTenantId(null)
    }
  }, [open])

  const label = injectable
    ? injectable.label[i18n.language] || injectable.label['en'] || injectable.key
    : ''
  const description = injectable
    ? injectable.description[i18n.language] || injectable.description['en'] || ''
    : ''

  const { data: assignments, isLoading } = useInjectableAssignments(
    open ? injectable?.key ?? null : null
  )

  const activateMutation = useActivateSystemInjectable()
  const deactivateMutation = useDeactivateSystemInjectable()
  const deleteMutation = useDeleteAssignment(injectable?.key ?? '')
  const excludeMutation = useExcludeAssignment(injectable?.key ?? '')
  const includeMutation = useIncludeAssignment(injectable?.key ?? '')

  const isToggling = activateMutation.isPending || deactivateMutation.isPending

  // Group and filter assignments
  const { publicAssignment, tenantGroups } = useMemo(() => {
    if (!assignments) return { publicAssignment: null, tenantGroups: [] }
    return groupAssignmentsByTenant(assignments)
  }, [assignments])

  const filteredGroups = useMemo(
    () => filterGroups(tenantGroups, searchQuery),
    [tenantGroups, searchQuery]
  )

  // Auto-expand tenants with matching workspaces when searching
  useEffect(() => {
    if (searchQuery.trim() && filteredGroups.length > 0) {
      const firstMatchingTenant = filteredGroups.find(
        (g) =>
          g.workspaceAssignments.length > 0 &&
          !g.tenantName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (firstMatchingTenant) {
        setExpandedTenantId(firstMatchingTenant.tenantId)
      }
    }
  }, [searchQuery, filteredGroups])

  function handleToggle(checked: boolean) {
    if (!injectable) return
    if (checked) {
      activateMutation.mutate(injectable.key)
    } else {
      deactivateMutation.mutate(injectable.key)
    }
  }

  function handleDelete(assignmentId: string) {
    deleteMutation.mutate(assignmentId)
  }

  function handleToggleAssignment(assignment: SystemInjectableAssignment) {
    if (assignment.isActive) {
      excludeMutation.mutate(assignment.id)
    } else {
      includeMutation.mutate(assignment.id)
    }
  }

  function handleTenantExpand(tenantId: string) {
    setExpandedTenantId((prev) => (prev === tenantId ? null : tenantId))
  }

  if (!injectable) return <></>

  const hasAssignments = (assignments?.length ?? 0) > 0
  const showPublicCard =
    publicAssignment && (!searchQuery || 'public'.includes(searchQuery.toLowerCase()))

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col overflow-hidden sm:max-w-md">
          <SheetHeader className="border-b border-border pb-4 pr-8">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-lg">{label}</SheetTitle>
                <SheetDescription className="mt-1">
                  {description || t('common.noDescription', 'No description')}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {injectable.isActive ? 'Active' : 'Inactive'}
                </span>
                <Switch
                  checked={injectable.isActive}
                  onCheckedChange={handleToggle}
                  disabled={!canManage || isToggling}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {injectable.key}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {injectable.dataType}
              </Badge>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Assignments Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t('systemInjectables.scopeAssignments', 'Scope Assignments')}
              </h3>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 font-mono text-xs uppercase"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus size={14} />
                  {t('systemInjectables.addScope', 'Add')}
                </Button>
              )}
            </div>

            {/* Search Filter */}
            {hasAssignments && !isLoading && (
              <div className="relative mb-4">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('systemInjectables.filterPlaceholder', 'Filter by name...')}
                  className="w-full border-b border-border bg-transparent py-2 pl-5 pr-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-foreground"
                />
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {/* Public Assignment Card */}
            {!isLoading && showPublicCard && (
              <PublicAssignmentCard
                assignment={publicAssignment}
                canManage={canManage}
                onDelete={() => handleDelete(publicAssignment.id)}
                onToggle={() => handleToggleAssignment(publicAssignment)}
                isDeleting={deleteMutation.isPending}
                isToggling={excludeMutation.isPending || includeMutation.isPending}
              />
            )}

            {/* Tenant Accordion */}
            {!isLoading && filteredGroups.length > 0 && (
              <div className="space-y-2">
                {filteredGroups.map((group) => (
                  <TenantAccordionItem
                    key={group.tenantId}
                    group={group}
                    isExpanded={expandedTenantId === group.tenantId}
                    onToggleExpand={() => handleTenantExpand(group.tenantId)}
                    canManage={canManage}
                    onDeleteAssignment={handleDelete}
                    onToggleAssignment={handleToggleAssignment}
                    isDeleting={deleteMutation.isPending}
                    isToggling={excludeMutation.isPending || includeMutation.isPending}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !hasAssignments && (
              <div className="py-8 text-center">
                <Globe size={32} className="mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t(
                    'systemInjectables.globalAvailability',
                    'Available globally to all workspaces'
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {t(
                    'systemInjectables.globalHint',
                    'Add assignments to restrict availability to specific scopes'
                  )}
                </p>
              </div>
            )}

            {/* No Search Results */}
            {!isLoading &&
              hasAssignments &&
              searchQuery &&
              filteredGroups.length === 0 &&
              !showPublicCard && (
                <div className="py-8 text-center">
                  <Search size={24} className="mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {t(
                      'systemInjectables.noMatchingAssignments',
                      'No assignments match your search'
                    )}
                  </p>
                </div>
              )}
          </div>
        </SheetContent>
      </Sheet>

      <CreateAssignmentDialog
        injectableKey={injectable.key}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  )
}

// Status indicator component
function StatusIndicator({
  status,
  size = 'sm',
}: {
  status: 'included' | 'excluded' | 'none'
  size?: 'sm' | 'md'
}): React.ReactElement {
  const sizeClass = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'

  if (status === 'included') {
    return <div className={cn(sizeClass, 'rounded-full bg-emerald-500')} />
  }
  if (status === 'excluded') {
    return <div className={cn(sizeClass, 'rounded-full bg-rose-500')} />
  }
  return <div className={cn(sizeClass, 'rounded-full border border-muted-foreground/50')} />
}

// Public assignment card
interface PublicAssignmentCardProps {
  assignment: SystemInjectableAssignment
  canManage: boolean
  onDelete: () => void
  onToggle: () => void
  isDeleting?: boolean
  isToggling?: boolean
}

function PublicAssignmentCard({
  assignment,
  canManage,
  onDelete,
  onToggle,
  isDeleting,
  isToggling,
}: PublicAssignmentCardProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="mb-4 flex items-center justify-between rounded-sm border border-dashed border-border bg-muted/20 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted/50">
          <Globe size={16} className="text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest">
              {t('systemInjectables.public', 'Public')}
            </span>
            <StatusIndicator status={assignment.isActive ? 'included' : 'excluded'} />
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {assignment.isActive
                ? t('systemInjectables.included', 'Included')
                : t('systemInjectables.excluded', 'Excluded')}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('systemInjectables.globalAvailability', 'Available globally')}
          </p>
        </div>
      </div>

      {canManage && (
        <AssignmentActions
          assignment={assignment}
          onDelete={onDelete}
          onToggle={onToggle}
          isDeleting={isDeleting}
          isToggling={isToggling}
        />
      )}
    </div>
  )
}

// Tenant accordion item
interface TenantAccordionItemProps {
  group: TenantGroup
  isExpanded: boolean
  onToggleExpand: () => void
  canManage: boolean
  onDeleteAssignment: (id: string) => void
  onToggleAssignment: (assignment: SystemInjectableAssignment) => void
  isDeleting?: boolean
  isToggling?: boolean
}

function TenantAccordionItem({
  group,
  isExpanded,
  onToggleExpand,
  canManage,
  onDeleteAssignment,
  onToggleAssignment,
  isDeleting,
  isToggling,
}: TenantAccordionItemProps): React.ReactElement {
  const { t } = useTranslation()
  const [visibleCount, setVisibleCount] = useState(WORKSPACES_PER_PAGE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset visible count when collapsed
  useEffect(() => {
    if (!isExpanded) {
      setVisibleCount(WORKSPACES_PER_PAGE)
    }
  }, [isExpanded])

  // Infinite scroll observer
  useEffect(() => {
    if (!isExpanded || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < group.workspaceAssignments.length) {
          setVisibleCount((prev) => Math.min(prev + WORKSPACES_PER_PAGE, group.workspaceAssignments.length))
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [isExpanded, visibleCount, group.workspaceAssignments.length])

  const hasTenantRule = group.tenantAssignment !== null
  const tenantStatus: 'included' | 'excluded' | 'none' = hasTenantRule
    ? group.tenantAssignment!.isActive
      ? 'included'
      : 'excluded'
    : 'none'

  const workspaceCount = group.workspaceAssignments.length
  const visibleWorkspaces = group.workspaceAssignments.slice(0, visibleCount)
  const hasMore = visibleCount < workspaceCount

  return (
    <div className="rounded-sm border border-border">
      {/* Tenant Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted/50">
            <Building2 size={16} className="text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{group.tenantName}</span>
              <ChevronRight
                size={14}
                className={cn(
                  'text-muted-foreground transition-transform duration-200',
                  isExpanded && 'rotate-90'
                )}
              />
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <StatusIndicator status={tenantStatus} />
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {hasTenantRule
                  ? group.tenantAssignment!.isActive
                    ? t('systemInjectables.included', 'Included')
                    : t('systemInjectables.excluded', 'Excluded')
                  : t('systemInjectables.noRule', 'No rule')}
              </span>
              {workspaceCount > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  · {workspaceCount}{' '}
                  {workspaceCount === 1
                    ? t('systemInjectables.workspace', 'workspace')
                    : t('systemInjectables.workspaces', 'workspaces')}
                </span>
              )}
            </div>
          </div>
        </div>

        {canManage && hasTenantRule && (
          <div onClick={(e) => e.stopPropagation()}>
            <AssignmentActions
              assignment={group.tenantAssignment!}
              onDelete={() => onDeleteAssignment(group.tenantAssignment!.id)}
              onToggle={() => onToggleAssignment(group.tenantAssignment!)}
              isDeleting={isDeleting}
              isToggling={isToggling}
            />
          </div>
        )}
      </button>

      {/* Workspaces List (Collapsible) */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[500px]' : 'max-h-0'
        )}
      >
        {workspaceCount > 0 && (
          <div className="max-h-[350px] overflow-y-auto border-t border-border">
            {visibleWorkspaces.map((ws, index) => (
              <WorkspaceRow
                key={ws.id}
                assignment={ws}
                isLast={index === visibleWorkspaces.length - 1 && !hasMore}
                canManage={canManage}
                onDelete={() => onDeleteAssignment(ws.id)}
                onToggle={() => onToggleAssignment(ws)}
                isDeleting={isDeleting}
                isToggling={isToggling}
              />
            ))}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-3">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  {t('systemInjectables.loadingMore', 'Loading more...')}
                </span>
              </div>
            )}
          </div>
        )}

        {workspaceCount === 0 && (
          <div className="border-t border-border py-4 text-center">
            <p className="text-xs text-muted-foreground/70">
              {t('systemInjectables.noWorkspaces', 'No workspace rules')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Workspace row
interface WorkspaceRowProps {
  assignment: SystemInjectableAssignment
  isLast: boolean
  canManage: boolean
  onDelete: () => void
  onToggle: () => void
  isDeleting?: boolean
  isToggling?: boolean
}

function WorkspaceRow({
  assignment,
  isLast,
  canManage,
  onDelete,
  onToggle,
  isDeleting,
  isToggling,
}: WorkspaceRowProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 pl-6 transition-colors hover:bg-muted/20',
        !isLast && 'border-b border-border'
      )}
    >
      <div className="flex items-center gap-2">
        <FolderOpen size={14} className="text-muted-foreground/70" />
        <span className="text-sm">{assignment.workspaceName || assignment.workspaceId?.slice(0, 8)}</span>
        <StatusIndicator status={assignment.isActive ? 'included' : 'excluded'} />
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          {assignment.isActive
            ? t('systemInjectables.included', 'Included')
            : t('systemInjectables.excluded', 'Excluded')}
        </span>
      </div>

      {canManage && (
        <AssignmentActions
          assignment={assignment}
          onDelete={onDelete}
          onToggle={onToggle}
          isDeleting={isDeleting}
          isToggling={isToggling}
          size="sm"
        />
      )}
    </div>
  )
}

// Reusable assignment actions dropdown
interface AssignmentActionsProps {
  assignment: SystemInjectableAssignment
  onDelete: () => void
  onToggle: () => void
  isDeleting?: boolean
  isToggling?: boolean
  size?: 'sm' | 'md'
}

function AssignmentActions({
  assignment,
  onDelete,
  onToggle,
  isDeleting,
  isToggling,
  size = 'md',
}: AssignmentActionsProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'}
          disabled={isDeleting || isToggling}
        >
          <MoreVertical size={size === 'sm' ? 12 : 14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onToggle} disabled={isToggling}>
          {assignment.isActive
            ? t('systemInjectables.exclude', 'Exclude')
            : t('systemInjectables.include', 'Include')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          disabled={isDeleting}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 size={14} className="mr-2" />
          {t('common.delete', 'Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
