import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Globe,
  Loader2,
  Search,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInfiniteTenants, type TenantItem } from '../hooks/useInfiniteTenants'
import { useInfiniteWorkspaces, type WorkspaceItem } from '../hooks/useInfiniteWorkspaces'
import type { ApiScopeType, BulkScopedAssignmentsRequest } from '../types'

export type BulkAssignmentAction = 'assign' | 'remove'

interface BulkAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: BulkAssignmentAction | null
  selectedKeys: string[]
  onConfirm: (req: BulkScopedAssignmentsRequest) => void
  isPending: boolean
}

type Step = 'scope' | 'tenant' | 'workspace' | 'confirm'

interface SelectedTarget {
  id: string
  name: string
}

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

export function BulkAssignmentDialog({
  open,
  onOpenChange,
  action,
  selectedKeys,
  onConfirm,
  isPending,
}: BulkAssignmentDialogProps): React.ReactElement {
  const { t } = useTranslation()

  const [step, setStep] = useState<Step>('scope')
  const [scopeType, setScopeType] = useState<ApiScopeType | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<SelectedTarget | null>(null)
  const [selectedWorkspace, setSelectedWorkspace] = useState<SelectedTarget | null>(null)
  const [tenantSearch, setTenantSearch] = useState('')
  const [workspaceSearch, setWorkspaceSearch] = useState('')

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('scope')
      setScopeType(null)
      setSelectedTenant(null)
      setSelectedWorkspace(null)
      setTenantSearch('')
      setWorkspaceSearch('')
    }
  }, [open])

  const tenantsQuery = useInfiniteTenants(tenantSearch)
  const workspacesQuery = useInfiniteWorkspaces(selectedTenant?.id ?? null, workspaceSearch)

  const tenants = useMemo(
    () => tenantsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [tenantsQuery.data]
  )

  const workspaces = useMemo(
    () => workspacesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [workspacesQuery.data]
  )

  const handleScopeSelect = useCallback((scope: ApiScopeType) => {
    setScopeType(scope)
    if (scope === 'PUBLIC') {
      setStep('confirm')
    } else if (scope === 'TENANT') {
      setStep('tenant')
    } else {
      setStep('tenant') // Need tenant first, then workspace
    }
  }, [])

  const handleTenantSelect = useCallback(
    (tenant: TenantItem) => {
      setSelectedTenant({ id: tenant.id, name: tenant.name })
      if (scopeType === 'TENANT') {
        setStep('confirm')
      } else {
        setStep('workspace')
      }
    },
    [scopeType]
  )

  const handleWorkspaceSelect = useCallback((workspace: WorkspaceItem) => {
    setSelectedWorkspace({ id: workspace.id, name: workspace.name })
    setStep('confirm')
  }, [])

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      if (scopeType === 'PUBLIC') {
        setStep('scope')
      } else if (scopeType === 'TENANT') {
        setSelectedTenant(null)
        setStep('tenant')
      } else {
        setSelectedWorkspace(null)
        setStep('workspace')
      }
    } else if (step === 'workspace') {
      setSelectedTenant(null)
      setStep('tenant')
    } else if (step === 'tenant') {
      setScopeType(null)
      setStep('scope')
    }
  }, [step, scopeType])

  const handleConfirm = useCallback(() => {
    if (!scopeType) return

    const req: BulkScopedAssignmentsRequest = {
      keys: selectedKeys,
      scopeType,
      tenantId: selectedTenant?.id,
      workspaceId: selectedWorkspace?.id,
    }

    onConfirm(req)
  }, [scopeType, selectedKeys, selectedTenant, selectedWorkspace, onConfirm])

  const isAssign = action === 'assign'
  const count = selectedKeys.length

  const scopeLabel =
    scopeType === 'PUBLIC'
      ? 'PUBLIC'
      : scopeType === 'TENANT'
        ? selectedTenant?.name ?? 'TENANT'
        : selectedWorkspace?.name ?? 'WORKSPACE'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-widest">
            {isAssign
              ? t('systemInjectables.bulk.assignScopeTitle', 'Assign Scope')
              : t('systemInjectables.bulk.removeScopeTitle', 'Remove Scope Assignment')}
          </DialogTitle>
          <DialogDescription>
            {isAssign
              ? t(
                  'systemInjectables.bulk.assignScopeDescription',
                  'Create scope assignments for {{count}} selected injectables.',
                  { count }
                )
              : t(
                  'systemInjectables.bulk.removeScopeDescription',
                  'Remove scope assignments from {{count}} selected injectables.',
                  { count }
                )}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Scope Selection */}
        {step === 'scope' && (
          <div className="space-y-1">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('systemInjectables.bulk.selectScope', 'Select scope type')}
            </p>
            {(['PUBLIC', 'TENANT', 'WORKSPACE'] as ApiScopeType[]).map((scope) => (
              <button
                key={scope}
                onClick={() => handleScopeSelect(scope)}
                className="flex w-full items-center gap-3 rounded-sm border border-border p-3 text-left transition-colors hover:bg-muted"
              >
                {scope === 'PUBLIC' && <Globe size={16} className="text-emerald-500" />}
                {scope === 'TENANT' && <Building2 size={16} className="text-blue-500" />}
                {scope === 'WORKSPACE' && <FolderOpen size={16} className="text-amber-500" />}
                <div className="flex-1">
                  <span className="font-mono text-xs uppercase tracking-wider">
                    {scope}
                  </span>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Step: Tenant Selection */}
        {step === 'tenant' && (
          <div className="space-y-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={12} />
              {t('common.back', 'Back')}
            </button>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('systemInjectables.bulk.selectTenant', 'Select tenant')}
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                placeholder={t('systemInjectables.searchTenant', 'Search tenants (min 3 chars)...')}
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                className="w-full rounded-sm border border-border bg-transparent py-2 pl-8 pr-3 text-sm outline-none focus:border-foreground"
              />
            </div>
            <div className="max-h-60 overflow-y-auto rounded-sm border border-border">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantSelect(tenant)}
                  className="flex w-full items-center gap-2 border-b border-border p-3 text-left transition-colors last:border-b-0 hover:bg-muted"
                >
                  <Building2 size={14} className="text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{tenant.name}</p>
                    {tenant.subtitle && (
                      <p className="font-mono text-[10px] text-muted-foreground">{tenant.subtitle}</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </button>
              ))}
              <InfiniteScrollSentinel
                onIntersect={() => tenantsQuery.fetchNextPage()}
                isLoading={tenantsQuery.isFetchingNextPage}
                hasMore={tenantsQuery.hasNextPage ?? false}
              />
              {tenants.length === 0 && !tenantsQuery.isLoading && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  {t('systemInjectables.noTenants', 'No tenants found')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step: Workspace Selection */}
        {step === 'workspace' && (
          <div className="space-y-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={12} />
              {selectedTenant?.name ?? t('common.back', 'Back')}
            </button>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('systemInjectables.bulk.selectWorkspace', 'Select workspace')}
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                placeholder={t('systemInjectables.searchWorkspace', 'Search workspaces (min 3 chars)...')}
                value={workspaceSearch}
                onChange={(e) => setWorkspaceSearch(e.target.value)}
                className="w-full rounded-sm border border-border bg-transparent py-2 pl-8 pr-3 text-sm outline-none focus:border-foreground"
              />
            </div>
            <div className="max-h-60 overflow-y-auto rounded-sm border border-border">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleWorkspaceSelect(workspace)}
                  className="flex w-full items-center gap-2 border-b border-border p-3 text-left transition-colors last:border-b-0 hover:bg-muted"
                >
                  <FolderOpen size={14} className="text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{workspace.name}</p>
                    {workspace.subtitle && (
                      <p className="font-mono text-[10px] text-muted-foreground">{workspace.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
              <InfiniteScrollSentinel
                onIntersect={() => workspacesQuery.fetchNextPage()}
                isLoading={workspacesQuery.isFetchingNextPage}
                hasMore={workspacesQuery.hasNextPage ?? false}
              />
              {workspaces.length === 0 && !workspacesQuery.isLoading && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  {t('systemInjectables.noWorkspaces', 'No workspaces found')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={12} />
              {t('common.back', 'Back')}
            </button>

            {/* Summary */}
            <div className="rounded-sm border border-border bg-muted/30 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {isAssign
                  ? t('systemInjectables.bulk.confirmAssignSummary', 'Will create {{scope}} assignments for:')
                  : t('systemInjectables.bulk.confirmRemoveSummary', 'Will remove {{scope}} assignments from:')}
              </p>
              <p className="mt-1 text-sm font-medium">{scopeLabel}</p>
            </div>

            {/* Keys List */}
            <div className="max-h-36 overflow-y-auto rounded-sm border border-border bg-muted/30 p-3">
              <ul className="space-y-1">
                {selectedKeys.map((key) => (
                  <li key={key} className="font-mono text-xs text-muted-foreground">
                    • {key}
                  </li>
                ))}
              </ul>
            </div>

            {/* Warning */}
            <div
              className={cn(
                'flex items-start gap-2 rounded-sm border p-3',
                isAssign
                  ? 'border-warning-border bg-warning-muted'
                  : 'border-destructive/30 bg-destructive/10'
              )}
            >
              <AlertTriangle
                size={16}
                className={cn(
                  'mt-0.5 shrink-0',
                  isAssign ? 'text-warning' : 'text-destructive'
                )}
              />
              <p className="text-xs text-muted-foreground">
                {isAssign
                  ? t(
                      'systemInjectables.bulk.warningAssign',
                      'This will make the selected injectables available at the chosen scope.'
                    )
                  : t(
                      'systemInjectables.bulk.warningRemoveAssign',
                      'This will remove the assignments, potentially restricting injectable availability.'
                    )}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="font-mono text-xs uppercase"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending}
                className={cn(
                  'font-mono text-xs uppercase',
                  isAssign
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                )}
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" />
                    {t('common.processing', 'Processing...')}
                  </>
                ) : isAssign ? (
                  t('systemInjectables.bulk.confirmAssign', 'Create Assignments')
                ) : (
                  t('systemInjectables.bulk.confirmRemoveAssign', 'Remove Assignments')
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
