import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppContextStore } from '@/stores/app-context-store'
import { usePageTransitionStore } from '@/stores/page-transition-store'
import { TemplatesToolbar } from './TemplatesToolbar'
import { TemplateListRow } from './TemplateListRow'
import { CreateTemplateDialog } from './CreateTemplateDialog'
import { EditTemplateDialog } from './EditTemplateDialog'
import { DeleteTemplateDialog } from './DeleteTemplateDialog'
import { useTemplates } from '../hooks/useTemplates'
import { useTags } from '../hooks/useTags'
import { Skeleton } from '@/components/ui/skeleton'
import type { TemplateListItem } from '@/types/api'

const PAGE_SIZE = 20

export function TemplatesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Search with debounce
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(
    undefined
  )
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Pagination
  const [page, setPage] = useState(0)

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Edit/Delete dialogs
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Page transition state
  const { isTransitioning, direction, startTransition, endTransition } = usePageTransitionStore()
  const [isExiting, setIsExiting] = useState(false)
  const [isEntering, setIsEntering] = useState(false)

  // Filter animation state - counter forces re-mount of rows
  const [filterAnimationKey, setFilterAnimationKey] = useState(0)
  const prevResultsRef = useRef<string | null>(null)

  // Handle entering animation (always on mount)
  useEffect(() => {
    // Siempre activar animación de entrada al montar
    setIsEntering(true)

    const timer = setTimeout(() => {
      if (direction === 'backward') {
        endTransition()
      }
      setIsEntering(false)
    }, 600)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar al montar

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, statusFilter, selectedTagIds])

  // Fetch tags
  const { data: tagsData } = useTags()

  // Fetch templates
  const { data, isLoading } = useTemplates({
    search: debouncedSearch || undefined,
    hasPublishedVersion: statusFilter,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  // Memoize templates to avoid dependency array issues
  const templates = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Detect filter result changes and trigger animation by incrementing key
  useEffect(() => {
    const currentResultsKey = templates.map((t) => t.id).join(',')

    // Si hay resultados y son diferentes a los anteriores
    if (templates.length > 0 && prevResultsRef.current !== currentResultsKey) {
      // No animar en la carga inicial (isEntering ya maneja eso)
      if (prevResultsRef.current !== null && !isEntering) {
        setFilterAnimationKey((k) => k + 1)
      }
    }

    prevResultsRef.current = currentResultsKey
  }, [templates, isEntering])

  // Pagination info
  const paginationInfo = useMemo(() => {
    if (total === 0) return t('templates.noTemplates', 'No templates found')
    const start = page * PAGE_SIZE + 1
    const end = Math.min((page + 1) * PAGE_SIZE, total)
    return t('templates.showing', 'Showing {{start}}-{{end}} of {{total}} templates', {
      start,
      end,
      total,
    })
  }, [page, total, t])

  const handleViewTemplateDetail = (templateId: string) => {
    if (currentWorkspace && !isTransitioning) {
      startTransition('forward')
      setIsExiting(true)
      // Wait for exit animation to complete before navigating
      setTimeout(() => {
        navigate({
          to: '/workspace/$workspaceId/templates/$templateId',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
          params: { workspaceId: currentWorkspace.id, templateId } as any,
        })
      }, 600)
    }
  }

  const handleGoToFolder = (folderId: string | undefined) => {
    if (!currentWorkspace) return

    // Si folderId es null, undefined, o 'root', navegar al root de documents (sin search param)
    const isRoot = !folderId || folderId === 'root'

    navigate({
      to: '/workspace/$workspaceId/documents',
      /* eslint-disable @typescript-eslint/no-explicit-any -- TanStack Router type limitation */
      params: { workspaceId: currentWorkspace.id } as any,
      search: isRoot ? undefined : { folderId } as any,
      /* eslint-enable @typescript-eslint/no-explicit-any */
    })
  }

  const handleOpenEditDialog = (template: TemplateListItem) => {
    setSelectedTemplate(template)
    setEditDialogOpen(true)
  }

  const handleOpenDeleteDialog = (template: TemplateListItem) => {
    setSelectedTemplate(template)
    setDeleteDialogOpen(true)
  }

  return (
    <motion.div
      className="animate-page-enter flex h-full flex-1 flex-col bg-background"
      animate={isExiting ? { opacity: 0 } : undefined}
      transition={isExiting ? { duration: 0.3, delay: 0.3 } : undefined}
    >
      {/* Header */}
      <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('templates.header', 'Management')}
            </div>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {t('templates.title', 'Template List')}
            </h1>
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="group flex h-12 items-center gap-2 rounded-none bg-foreground px-6 text-sm font-medium tracking-wide text-background shadow-lg shadow-muted transition-colors hover:bg-foreground/90"
          >
            <Plus size={20} />
            <span>{t('templates.createNew', 'CREATE NEW TEMPLATE')}</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <TemplatesToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        tags={tagsData?.data ?? []}
        selectedTagIds={selectedTagIds}
        onTagsChange={setSelectedTagIds}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 md:px-6 lg:px-6">
        {/* Loading state - don't show during enter transition (data should be cached) */}
        {isLoading && !isEntering && (
          <div className="space-y-4 pt-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-muted-foreground">
              {t('templates.noTemplates', 'No templates found')}
            </p>
            {(debouncedSearch || statusFilter !== undefined || selectedTagIds.length > 0) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter(undefined)
                  setSelectedTagIds([])
                }}
                className="mt-4 text-sm text-foreground underline underline-offset-4 hover:no-underline"
              >
                {t('templates.clearFilters', 'Clear filters')}
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!isLoading && templates.length > 0 && (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                <th className="w-[40%] border-b border-border py-4 pl-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.name', 'Template Name')}
                </th>
                <th className="w-[15%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.versions', 'Versions')}
                </th>
                <th className="w-[15%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.status', 'Status')}
                </th>
                <th className="w-[15%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.lastModified', 'Last Modified')}
                </th>
                <th className="w-[10%] border-b border-border py-4 pr-4 text-center font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.action', 'Action')}
                </th>
              </tr>
            </thead>
            <tbody className="font-light">
              {templates.map((template, index) => (
                <TemplateListRow
                  key={`${template.id}-${filterAnimationKey}`}
                  template={template}
                  index={index}
                  isExiting={isExiting}
                  isEntering={isEntering || filterAnimationKey > 0}
                  isFilterAnimating={filterAnimationKey > 0}
                  onClick={() => handleViewTemplateDetail(template.id)}
                  onGoToFolder={handleGoToFolder}
                  onEdit={() => handleOpenEditDialog(template)}
                  onDelete={() => handleOpenDeleteDialog(template)}
                />
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between py-8">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {paginationInfo}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Template Dialog */}
      <EditTemplateDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        template={selectedTemplate}
      />

      {/* Delete Template Dialog */}
      <DeleteTemplateDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        template={selectedTemplate}
      />
    </motion.div>
  )
}
