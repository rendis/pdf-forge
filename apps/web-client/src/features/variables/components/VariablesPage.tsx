import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/features/auth/hooks/usePermission'
import { Permission } from '@/features/auth/rbac/rules'
import { useAppContextStore } from '@/stores/app-context-store'
import { motion } from 'framer-motion'
import { Plus, Variable } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceInjectables } from '../hooks/useWorkspaceInjectables'
import type { WorkspaceInjectable } from '../types'
import { CreateInjectableDialog } from './CreateInjectableDialog'
import { DeleteInjectableDialog } from './DeleteInjectableDialog'
import { EditInjectableDialog } from './EditInjectableDialog'
import { InjectablesTable } from './InjectablesTable'

export function VariablesPage(): React.ReactElement {
  const { t } = useTranslation()
  const { currentWorkspace } = useAppContextStore()
  const { hasPermission } = usePermission()

  const canCreate = hasPermission(Permission.INJECTABLE_CREATE)

  const { data: injectables, isLoading } = useWorkspaceInjectables(
    currentWorkspace?.id ?? null
  )

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedInjectable, setSelectedInjectable] =
    useState<WorkspaceInjectable | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  function handleEdit(injectable: WorkspaceInjectable): void {
    setSelectedInjectable(injectable)
    setEditDialogOpen(true)
  }

  function handleDelete(injectable: WorkspaceInjectable): void {
    setSelectedInjectable(injectable)
    setDeleteDialogOpen(true)
  }

  return (
    <motion.div className="animate-page-enter flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('variables.header', 'Workspace')}
            </div>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {t('variables.title', 'Variables')}
            </h1>
          </div>
          {canCreate && (
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="group flex h-12 items-center gap-2 rounded-none bg-foreground px-6 text-sm font-medium tracking-wide text-background shadow-lg shadow-muted transition-colors hover:bg-foreground/90"
            >
              <Plus size={20} />
              <span>{t('variables.create', 'CREATE VARIABLE')}</span>
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 md:px-6 lg:px-6">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4 pt-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!injectables || injectables.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <Variable size={32} className="text-muted-foreground" />
            </div>
            <p className="text-lg text-muted-foreground">
              {t('variables.empty', 'No variables defined yet')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70">
              {t(
                'variables.emptyHint',
                'Create your first variable to use in templates'
              )}
            </p>
            {canCreate && (
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="mt-6 flex items-center gap-2 border-b border-transparent pb-0.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                <Plus size={16} />
                {t('variables.create', 'Create Variable')}
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!isLoading && injectables && injectables.length > 0 && (
          <InjectablesTable
            injectables={injectables}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Dialogs */}
      <CreateInjectableDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditInjectableDialog
        key={selectedInjectable?.id ?? 'new'}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        injectable={selectedInjectable}
      />

      <DeleteInjectableDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        injectable={selectedInjectable}
      />
    </motion.div>
  )
}
