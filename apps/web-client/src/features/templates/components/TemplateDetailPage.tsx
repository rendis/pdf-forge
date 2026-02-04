import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useAppContextStore } from '@/stores/app-context-store'
import { usePageTransitionStore } from '@/stores/page-transition-store'
import type { TemplateVersionSummaryResponse, VersionStatus } from '@/types/api'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import {
    AlertTriangle,
    Archive,
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    FileType,
    FolderOpen,
    Layers,
    Pencil,
    Plus,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentTypeConflictError } from '../api/templates-api'
import {
    usePublishVersion,
    useSchedulePublishVersion,
    useTemplateWithVersions,
} from '../hooks/useTemplateDetail'
import { useUpdateTemplate, useAssignDocumentType } from '../hooks/useTemplates'
import { DocumentTypeSelector } from '@/features/administration/components/DocumentTypeSelector'
import { ArchiveVersionDialog } from './ArchiveVersionDialog'
import { DocumentTypeConflictDialog } from './DocumentTypeConflictDialog'
import { CancelScheduleDialog } from './CancelScheduleDialog'
import { CloneVersionDialog } from './CloneVersionDialog'
import { CreateVersionDialog } from './CreateVersionDialog'
import { DeleteVersionDialog } from './DeleteVersionDialog'
import { EditableTitle } from './EditableTitle'
import { EditTagsDialog } from './EditTagsDialog'
import { PublishVersionDialog } from './PublishVersionDialog'
import { SchedulePublishDialog } from './SchedulePublishDialog'
import { TagBadge } from './TagBadge'
import { ValidationErrorsDialog, type ValidationResponse } from './ValidationErrorsDialog'
import { VersionListItem } from './VersionListItem'

function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TemplateDetailPage() {
  const { templateId } = useParams({
    from: '/workspace/$workspaceId/templates/$templateId',
  })
  const { fromFolderId } = useSearch({
    from: '/workspace/$workspaceId/templates/$templateId',
  })
  const { currentWorkspace } = useAppContextStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editTagsDialogOpen, setEditTagsDialogOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationResponse | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersionSummaryResponse | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [versionToDelete, setVersionToDelete] = useState<TemplateVersionSummaryResponse | null>(null)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [versionToArchive, setVersionToArchive] = useState<TemplateVersionSummaryResponse | null>(null)
  const [cancelScheduleDialogOpen, setCancelScheduleDialogOpen] = useState(false)
  const [versionToCancelSchedule, setVersionToCancelSchedule] = useState<TemplateVersionSummaryResponse | null>(null)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [versionToClone, setVersionToClone] = useState<TemplateVersionSummaryResponse | null>(null)
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean
    conflict: { id: string; title: string } | null
    pendingTypeId: string | null
  }>({ open: false, conflict: null, pendingTypeId: null })

  // Template update mutation
  const updateTemplate = useUpdateTemplate()
  const assignDocumentType = useAssignDocumentType()

  // Version action mutations
  const publishVersion = usePublishVersion(templateId)
  const schedulePublishVersion = useSchedulePublishVersion(templateId)

  const handleTitleSave = async (newTitle: string) => {
    await updateTemplate.mutateAsync({
      templateId,
      data: { title: newTitle },
    })
  }

  const handleAssignDocumentType = async (documentTypeId: string | null) => {
    try {
      await assignDocumentType.mutateAsync({
        templateId,
        data: { documentTypeId },
      })
    } catch (error) {
      if (error instanceof DocumentTypeConflictError) {
        setConflictDialog({
          open: true,
          conflict: error.conflict,
          pendingTypeId: documentTypeId,
        })
        return
      }
      throw error
    }
  }

  const handleForceAssignDocumentType = async () => {
    if (!conflictDialog.pendingTypeId) return
    try {
      await assignDocumentType.mutateAsync({
        templateId,
        data: { documentTypeId: conflictDialog.pendingTypeId, force: true },
      })
      setConflictDialog({ open: false, conflict: null, pendingTypeId: null })
    } catch (error) {
      setConflictDialog({ open: false, conflict: null, pendingTypeId: null })
      throw error
    }
  }

  const handleCancelConflict = () => {
    setConflictDialog({ open: false, conflict: null, pendingTypeId: null })
  }

  // Page transition state
  const { isTransitioning, direction, startTransition, endTransition } = usePageTransitionStore()
  const [isVisible, setIsVisible] = useState(direction !== 'forward')
  const [_isExiting, setIsExiting] = useState(false)

  // Handle entering animation (coming from list)
  useEffect(() => {
    if (direction === 'forward') {
      // Small delay before starting fade in
      const timer = setTimeout(() => {
        setIsVisible(true)
        endTransition()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [direction, endTransition])

  const { data: template, isLoading, error } = useTemplateWithVersions(templateId)

  // Check if we have cached data (to avoid skeleton flash)
  const hasCachedData = !!template

  // Calculate version counts by status
  const versions = template?.versions
  const versionCounts = useMemo(() => {
    if (!versions) {
      return {
        PUBLISHED: 0,
        SCHEDULED: 0,
        DRAFT: 0,
        ARCHIVED: 0,
      }
    }
    return versions.reduce(
      (acc, version) => {
        acc[version.status] = (acc[version.status] || 0) + 1
        return acc
      },
      {
        PUBLISHED: 0,
        SCHEDULED: 0,
        DRAFT: 0,
        ARCHIVED: 0,
      } as Record<VersionStatus, number>
    )
  }, [versions])

  // User's filter toggle preferences (true = show, false = hide)
  const [userFilterToggles, setUserFilterToggles] = useState<Record<VersionStatus, boolean>>({
    PUBLISHED: true,
    SCHEDULED: true,
    DRAFT: true,
    ARCHIVED: true,
  })

  // Effective filters: user preference AND count > 0
  const versionFilters = useMemo(() => ({
    PUBLISHED: userFilterToggles.PUBLISHED && versionCounts.PUBLISHED > 0,
    SCHEDULED: userFilterToggles.SCHEDULED && versionCounts.SCHEDULED > 0,
    DRAFT: userFilterToggles.DRAFT && versionCounts.DRAFT > 0,
    ARCHIVED: userFilterToggles.ARCHIVED && versionCounts.ARCHIVED > 0,
  }), [userFilterToggles, versionCounts])


  // Sort versions according to business rules:
  // 1. Published version first
  // 2. Scheduled versions (by scheduledPublishAt ascending)
  // 3. Draft versions (by updatedAt descending)
  // 4. Archived versions (by updatedAt descending)
  const sortedVersions = useMemo(() => {
    if (!versions || versions.length === 0) return []
    
    // Filter versions based on active filters
    const filteredVersions = versions.filter((v) => versionFilters[v.status])
    
    // Helper function to get sort date for drafts and archived
    const getSortDate = (version: typeof filteredVersions[0]): number => {
      if (version.updatedAt) {
        return new Date(version.updatedAt).getTime()
      }
      // Fallback to createdAt if updatedAt is not available
      return new Date(version.createdAt).getTime()
    }
    
    // Separate versions by status
    const published: typeof filteredVersions = []
    const scheduled: typeof filteredVersions = []
    const drafts: typeof filteredVersions = []
    const archived: typeof filteredVersions = []
    
    for (const version of filteredVersions) {
      if (version.status === 'PUBLISHED') {
        published.push(version)
      } else if (version.status === 'SCHEDULED') {
        scheduled.push(version)
      } else if (version.status === 'DRAFT') {
        drafts.push(version)
      } else if (version.status === 'ARCHIVED') {
        archived.push(version)
      }
    }
    
    // Sort scheduled by scheduledPublishAt ascending (earliest first)
    scheduled.sort((a, b) => {
      if (!a.scheduledPublishAt && !b.scheduledPublishAt) return 0
      if (!a.scheduledPublishAt) return 1 // Versions without scheduledPublishAt go to end
      if (!b.scheduledPublishAt) return -1
      const dateA = new Date(a.scheduledPublishAt).getTime()
      const dateB = new Date(b.scheduledPublishAt).getTime()
      if (isNaN(dateA) || isNaN(dateB)) return 0
      return dateA - dateB
    })
    
    // Sort drafts by updatedAt descending (most recent first)
    drafts.sort((a, b) => {
      const dateA = getSortDate(a)
      const dateB = getSortDate(b)
      if (isNaN(dateA) || isNaN(dateB)) return 0
      return dateB - dateA
    })
    
    // Sort archived by updatedAt descending (most recent first)
    archived.sort((a, b) => {
      const dateA = getSortDate(a)
      const dateB = getSortDate(b)
      if (isNaN(dateA) || isNaN(dateB)) return 0
      return dateB - dateA
    })
    
    // Concatenate in the required order
    return [...published, ...scheduled, ...drafts, ...archived]
  }, [versions, versionFilters])

  const handleBackToList = () => {
    if (currentWorkspace && !isTransitioning) {
      startTransition('backward')
      setIsExiting(true)
      setIsVisible(false)
      // Wait for exit animation to complete before navigating
      setTimeout(() => {
        if (fromFolderId) {
          // Volver al folder de origen (si es 'root', no pasar folderId)
          navigate({
            to: '/workspace/$workspaceId/documents',
            /* eslint-disable @typescript-eslint/no-explicit-any -- TanStack Router type limitation */
            params: { workspaceId: currentWorkspace.id } as any,
            search: fromFolderId === 'root' ? undefined : { folderId: fromFolderId } as any,
            /* eslint-enable @typescript-eslint/no-explicit-any */
          })
        } else {
          // Volver a la lista de templates
          navigate({
            to: '/workspace/$workspaceId/templates',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
            params: { workspaceId: currentWorkspace.id } as any,
          })
        }
      }, 300)
    }
  }

  const handleOpenEditor = (versionId: string) => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/editor/$templateId/version/$versionId',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
        params: { workspaceId: currentWorkspace.id, templateId, versionId } as any,
      })
    }
  }

  const handleGoToFolder = () => {
    if (!currentWorkspace || !template?.folderId) return
    navigate({
      to: '/workspace/$workspaceId/documents',
      /* eslint-disable @typescript-eslint/no-explicit-any -- TanStack Router type limitation */
      params: { workspaceId: currentWorkspace.id } as any,
      search: { folderId: template.folderId } as any,
      /* eslint-enable @typescript-eslint/no-explicit-any */
    })
  }

  // Version action handlers
  const handlePublishClick = (version: TemplateVersionSummaryResponse) => {
    setSelectedVersion(version)
    setPublishDialogOpen(true)
  }

  const handleScheduleClick = (version: TemplateVersionSummaryResponse) => {
    setSelectedVersion(version)
    setScheduleDialogOpen(true)
  }

  const handlePublishConfirm = async () => {
    if (!selectedVersion) return
    try {
      await publishVersion.mutateAsync(selectedVersion.id)
      setPublishDialogOpen(false)
      setSelectedVersion(null)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const validation = error.response.data?.validation as ValidationResponse | undefined
        if (validation) {
          setValidationErrors(validation)
          setPublishDialogOpen(false)
          setValidationDialogOpen(true)
          return
        }
      }
      throw error
    }
  }

  const handleScheduleConfirm = async (publishAt: string) => {
    if (!selectedVersion) return
    try {
      await schedulePublishVersion.mutateAsync({
        versionId: selectedVersion.id,
        publishAt,
      })
      setScheduleDialogOpen(false)
      setSelectedVersion(null)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const errorData = error.response.data as { error?: string }
        if (errorData.error === 'another version is already scheduled at this time') {
          toast({
            variant: 'destructive',
            title: t('templates.scheduleDialog.error.conflictTitle', 'Scheduling Conflict'),
            description: t('templates.scheduleDialog.error.conflictDescription', 'Another version is already scheduled at this time.'),
          })
          return
        }
      }
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const validation = error.response.data?.validation as ValidationResponse | undefined
        if (validation) {
          setValidationErrors(validation)
          setScheduleDialogOpen(false)
          setValidationDialogOpen(true)
          return
        }
      }
      throw error
    }
  }

  const handleCancelSchedule = (version: TemplateVersionSummaryResponse) => {
    setVersionToCancelSchedule(version)
    setCancelScheduleDialogOpen(true)
  }

  const handleArchive = (version: TemplateVersionSummaryResponse) => {
    setVersionToArchive(version)
    setArchiveDialogOpen(true)
  }

  const handleDelete = (version: TemplateVersionSummaryResponse) => {
    setVersionToDelete(version)
    setDeleteDialogOpen(true)
  }

  const handleCloneClick = (version: TemplateVersionSummaryResponse) => {
    setVersionToClone(version)
    setCloneDialogOpen(true)
  }

  // Loading state - only show skeleton if no cached data
  // Use same animation as main content to avoid flicker
  if (isLoading && !hasCachedData) {
    return (
      <motion.div
        className="flex h-full flex-1 flex-col bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-10 w-64" />
        </header>
        <div className="flex-1 px-4 pb-12 md:px-6 lg:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </motion.div>
    )
  }

  // Error state
  if (error || !template) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">
          {t('templates.detail.notFound', 'Template not found')}
        </p>
        <button
          onClick={handleBackToList}
          className="mt-4 text-sm text-foreground underline underline-offset-4 hover:no-underline"
        >
          {fromFolderId
            ? t('templates.detail.backToFolder', 'Back to Folder')
            : t('templates.detail.backToList', 'Back to Templates')}
        </button>
      </div>
    )
  }

  return (
    <motion.div
      className="flex h-full flex-1 flex-col bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Warning: published but no document type — overlay, no layout shift */}
      <div className="sticky top-0 z-40 h-0">
        <AnimatePresence initial={false}>
          {template.versions?.some((v) => v.status === 'PUBLISHED') && !template.documentTypeId && (
            <motion.div
              key="no-type-warning"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <div className="flex items-center gap-2 border-b border-warning/30 bg-warning-muted/60 px-6 py-2 dark:bg-warning-muted/50">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning dark:text-warning-border" />
                <span className="text-sm text-warning-foreground">
                  {t('templates.warnings.noDocumentTypeDescription', "This template has a published version but no document type. It won't be found via the internal render API.")}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
        {/* Breadcrumb */}
        <button
          onClick={handleBackToList}
          className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {fromFolderId
            ? t('templates.detail.backToFolder', 'Back to Folder')
            : t('templates.detail.backToList', 'Back to Templates')}
        </button>

        {/* Title */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('templates.detail.header', 'Template Details')}
            </div>
            <EditableTitle
              value={template.title}
              onSave={handleTitleSave}
              isLoading={updateTemplate.isPending}
              className="font-display text-3xl font-light leading-tight tracking-tight text-foreground md:text-4xl"
            />
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="group flex h-12 items-center gap-2 rounded-none bg-foreground px-6 text-sm font-medium tracking-wide text-background shadow-lg shadow-muted transition-colors hover:bg-foreground/90"
          >
            <Plus size={20} />
            <span>{t('templates.detail.createVersion', 'Create New Version')}</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 md:px-6 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          {/* Left Panel: Template Info */}
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="border border-border bg-background p-6">
              <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('templates.detail.information', 'Information')}
              </h2>

              <dl className="space-y-4">
                {/* Folder */}
                {template.folder && (
                  <div>
                    <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FolderOpen size={12} />
                      {t('templates.detail.folder', 'Folder')}
                    </dt>
                    <dd>
                      <button
                        onClick={handleGoToFolder}
                        className="text-sm text-foreground underline-offset-2 hover:underline"
                      >
                        {template.folder.name}
                      </button>
                    </dd>
                  </div>
                )}

                {/* Created */}
                <div>
                  <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    {t('templates.detail.createdAt', 'Created')}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {formatDate(template.createdAt)}
                  </dd>
                </div>

                {/* Last Updated */}
                <div>
                  <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={12} />
                    {t('templates.detail.updatedAt', 'Last Updated')}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {formatDate(template.updatedAt)}
                  </dd>
                </div>

                {/* Version Count */}
                <div>
                  <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers size={12} />
                    {t('templates.detail.versionsCount', 'Versions')}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {template.versions?.length ?? 0}
                  </dd>
                </div>

                {/* Document Type */}
                <div>
                  <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileType size={12} className="shrink-0" />
                    <span className="shrink-0">{t('templates.detail.documentType', 'Document Type')}</span>
                    <motion.span
                      animate={
                        template.versions?.some((v) => v.status === 'PUBLISHED') && !template.documentTypeId
                          ? { opacity: 1, x: 0, width: 'auto', marginLeft: 4 }
                          : { opacity: 0, x: -20, width: 0, marginLeft: 0 }
                      }
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="inline-flex shrink-0 items-center gap-1 overflow-hidden border border-warning/50 bg-warning-muted/60 px-1.5 py-0.5 text-warning-foreground dark:border-warning-border dark:bg-warning-muted/50"
                    >
                      <AlertTriangle size={10} className="shrink-0" />
                      <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-widest">
                        {t('templates.warnings.noDocumentType', 'No type assigned')}
                      </span>
                    </motion.span>
                  </dt>
                  <dd>
                    <DocumentTypeSelector
                      currentTypeId={template.documentTypeId}
                      currentTypeName={template.documentTypeName}
                      onAssign={handleAssignDocumentType}
                      disabled={assignDocumentType.isPending}
                    />
                  </dd>
                </div>
              </dl>
            </div>

            {/* Tags Card */}
            <div className="border border-border bg-background p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t('templates.detail.tags', 'Tags')}
                </h2>
                <button
                  onClick={() => setEditTagsDialogOpen(true)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  title={t('templates.detail.editTags', 'Edit tags')}
                >
                  <Pencil size={14} />
                </button>
              </div>

              {template.tags && template.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('templates.detail.noTags', 'No tags')}
                </p>
              )}
            </div>
          </div>

          {/* Right Panel: Version History */}
          <div className="border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('templates.detail.versionsSection', 'Version History')}
              </h2>
              <div className="flex items-center gap-3">
                {/* Version filters */}
                <div className="flex items-center gap-1.5">
                  {/* Published filter */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() =>
                          setUserFilterToggles((prev) => ({
                            ...prev,
                            PUBLISHED: !prev.PUBLISHED,
                          }))
                        }
                        disabled={versionCounts.PUBLISHED === 0}
                        className={cn(
                          'flex items-center gap-1.5 rounded-sm border px-1.5 py-1 transition-colors',
                          versionCounts.PUBLISHED === 0
                            ? 'cursor-not-allowed border-border bg-background text-muted-foreground opacity-30'
                            : versionFilters.PUBLISHED
                              ? 'border-success-border/50 bg-success-muted text-success'
                              : 'border-border bg-background text-muted-foreground opacity-50 hover:opacity-75'
                        )}
                      >
                        <CheckCircle2 size={14} />
                        <span className="font-mono text-[10px]">{versionCounts.PUBLISHED}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-mono text-xs">
                      {t('templates.detail.filters.published', 'Publicadas')}
                    </TooltipContent>
                  </Tooltip>

                  {/* Scheduled filter */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() =>
                          setUserFilterToggles((prev) => ({
                            ...prev,
                            SCHEDULED: !prev.SCHEDULED,
                          }))
                        }
                        disabled={versionCounts.SCHEDULED === 0}
                        className={cn(
                          'flex items-center gap-1.5 rounded-sm border px-1.5 py-1 transition-colors',
                          versionCounts.SCHEDULED === 0
                            ? 'cursor-not-allowed border-border bg-background text-muted-foreground opacity-30'
                            : versionFilters.SCHEDULED
                              ? 'border-info-border/50 bg-info-muted text-info'
                              : 'border-border bg-background text-muted-foreground opacity-50 hover:opacity-75'
                        )}
                      >
                        <Clock size={14} />
                        <span className="font-mono text-[10px]">{versionCounts.SCHEDULED}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-mono text-xs">
                      {t('templates.detail.filters.scheduled', 'Agendadas')}
                    </TooltipContent>
                  </Tooltip>

                  {/* Draft filter */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() =>
                          setUserFilterToggles((prev) => ({
                            ...prev,
                            DRAFT: !prev.DRAFT,
                          }))
                        }
                        disabled={versionCounts.DRAFT === 0}
                        className={cn(
                          'flex items-center gap-1.5 rounded-sm border px-1.5 py-1 transition-colors',
                          versionCounts.DRAFT === 0
                            ? 'cursor-not-allowed border-border bg-background text-muted-foreground opacity-30'
                            : versionFilters.DRAFT
                              ? 'border-warning-border/50 bg-warning-muted text-warning-foreground'
                              : 'border-border bg-background text-muted-foreground opacity-50 hover:opacity-75'
                        )}
                      >
                        <FileText size={14} />
                        <span className="font-mono text-[10px]">{versionCounts.DRAFT}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-mono text-xs">
                      {t('templates.detail.filters.draft', 'Borradores')}
                    </TooltipContent>
                  </Tooltip>

                  {/* Archived filter */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() =>
                          setUserFilterToggles((prev) => ({
                            ...prev,
                            ARCHIVED: !prev.ARCHIVED,
                          }))
                        }
                        disabled={versionCounts.ARCHIVED === 0}
                        className={cn(
                          'flex items-center gap-1.5 rounded-sm border px-1.5 py-1 transition-colors',
                          versionCounts.ARCHIVED === 0
                            ? 'cursor-not-allowed border-border bg-background text-muted-foreground opacity-30'
                            : versionFilters.ARCHIVED
                              ? 'border-muted-foreground/30 bg-muted text-muted-foreground'
                              : 'border-border bg-background text-muted-foreground opacity-50 hover:opacity-75'
                        )}
                      >
                        <Archive size={14} />
                        <span className="font-mono text-[10px]">{versionCounts.ARCHIVED}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-mono text-xs">
                      {t('templates.detail.filters.archived', 'Archivadas')}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Version count */}
                <span className="font-mono text-[10px] text-muted-foreground">
                  {t('templates.detail.versionsTotal', '{{count}} version(s)', {
                    count: sortedVersions.length,
                  })}
                </span>
              </div>
            </div>

            {sortedVersions.length > 0 ? (
              <div className="divide-y divide-border">
                {sortedVersions.map((version) => (
                  <VersionListItem
                    key={version.id}
                    version={version}
                    onOpenEditor={handleOpenEditor}
                    onPublish={handlePublishClick}
                    onSchedule={handleScheduleClick}
                    onCancelSchedule={handleCancelSchedule}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onClone={handleCloneClick}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText size={32} className="mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t('templates.detail.noVersions', 'No versions yet')}
                </p>
                <button
                  onClick={() => setCreateDialogOpen(true)}
                  className="mt-4 text-sm text-foreground underline underline-offset-4 hover:no-underline"
                >
                  {t('templates.detail.createFirstVersion', 'Create first version')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Version Dialog */}
      <CreateVersionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        templateId={templateId}
      />

      {/* Edit Tags Dialog */}
      <EditTagsDialog
        open={editTagsDialogOpen}
        onOpenChange={setEditTagsDialogOpen}
        templateId={templateId}
        currentTags={template.tags ?? []}
      />

      {/* Publish Version Dialog */}
      <PublishVersionDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        version={selectedVersion}
        onConfirm={handlePublishConfirm}
        isLoading={publishVersion.isPending}
      />

      {/* Schedule Publish Dialog */}
      <SchedulePublishDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        version={selectedVersion}
        onConfirm={handleScheduleConfirm}
        isLoading={schedulePublishVersion.isPending}
      />

      {/* Validation Errors Dialog */}
      <ValidationErrorsDialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        validation={validationErrors}
        onOpenEditor={
          selectedVersion
            ? () => handleOpenEditor(selectedVersion.id)
            : undefined
        }
      />

      {/* Delete Version Dialog */}
      <DeleteVersionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        version={versionToDelete}
        templateId={templateId}
      />

      {/* Archive Version Dialog */}
      <ArchiveVersionDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        version={versionToArchive}
        templateId={templateId}
      />

      {/* Cancel Schedule Dialog */}
      <CancelScheduleDialog
        open={cancelScheduleDialogOpen}
        onOpenChange={setCancelScheduleDialogOpen}
        version={versionToCancelSchedule}
        templateId={templateId}
      />

      {/* Clone Version Dialog */}
      <CloneVersionDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        templateId={templateId}
        sourceVersion={versionToClone}
      />

      <DocumentTypeConflictDialog
        open={conflictDialog.open}
        conflictTemplate={conflictDialog.conflict}
        onCancel={handleCancelConflict}
        onForce={handleForceAssignDocumentType}
        isLoading={assignDocumentType.isPending}
      />
    </motion.div>
  )
}
