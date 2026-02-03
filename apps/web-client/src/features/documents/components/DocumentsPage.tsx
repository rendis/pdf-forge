import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type Collision,
  type Modifier,
} from '@dnd-kit/core'
import { DocumentsToolbar } from './DocumentsToolbar'
import { DroppableBreadcrumb } from './DroppableBreadcrumb'
import { FolderCard } from './FolderCard'
import { TemplateCard } from './TemplateCard'
import { CreateFolderDialog } from './CreateFolderDialog'
import { CreateTemplateDialog } from '@/features/templates/components/CreateTemplateDialog'
import { RenameFolderDialog } from './RenameFolderDialog'
import { DeleteFolderDialog } from './DeleteFolderDialog'
import { MoveFolderDialog } from './MoveFolderDialog'
import { MoveTemplateDialog } from './MoveTemplateDialog'
import { ConfirmMoveFolderDialog } from './ConfirmMoveFolderDialog'
import { DragPreview } from './DragPreview'
import { SelectionToolbar } from './SelectionToolbar'
import { DraggableFolderCard } from './DraggableFolderCard'
import { DraggableTemplateCard } from './DraggableTemplateCard'
import { DroppableFolderZone } from './DroppableFolderZone'
import {
  FolderSelectionProvider,
  useFolderSelection,
} from '../context/FolderSelectionContext'
import { useFolders, useMoveFolder } from '../hooks/useFolders'
import { useFolderNavigation } from '../hooks/useFolderNavigation'
import { useTemplatesByFolder, useMoveTemplate } from '../hooks/useTemplates'
import { Skeleton } from '@/components/ui/skeleton'
import type { Folder, TemplateListItem } from '@/types/api'

// Custom modifier: center on cursor, then offset below so it doesn't cover drop targets
const snapBelowCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  // Si no hay datos necesarios, usar transform original
  if (!activatorEvent || !draggingNodeRect) {
    return transform
  }

  // Obtener posición del evento (donde se hizo click)
  const activatorCoordinates = {
    x: (activatorEvent as MouseEvent).clientX,
    y: (activatorEvent as MouseEvent).clientY,
  }

  // Calcular offset desde esquina del elemento al punto de click
  const offsetX = activatorCoordinates.x - draggingNodeRect.left
  const offsetY = activatorCoordinates.y - draggingNodeRect.top

  // Ajustar transform para centrar en cursor y luego mover abajo
  return {
    ...transform,
    x: transform.x + offsetX - draggingNodeRect.width / 2,
    y: transform.y + offsetY + 16, // 16px debajo del cursor
  }
}

// Animation variants for folder navigation transitions
const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}


function DocumentsPageContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { workspaceId } = useParams({ strict: false })

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  // Tiempo mínimo para mostrar el skeleton (evita flash)
  const [minLoadingComplete, setMinLoadingComplete] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinLoadingComplete(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  // DnD sensors - require 8px movement before drag starts (allows clicks to pass)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Custom collision detection: ONLY uses cursor position, ignores dragged element rect
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const { pointerCoordinates, droppableRects, droppableContainers } = args

    // If no pointer coordinates, fallback to rect intersection
    if (!pointerCoordinates) {
      return rectIntersection(args)
    }

    const collisions: Collision[] = []

    for (const droppableContainer of droppableContainers) {
      const { id } = droppableContainer
      const rect = droppableRects.get(id)

      if (rect) {
        // Check if pointer is within the droppable rect
        const isWithin =
          pointerCoordinates.x >= rect.left &&
          pointerCoordinates.x <= rect.right &&
          pointerCoordinates.y >= rect.top &&
          pointerCoordinates.y <= rect.bottom

        if (isWithin) {
          collisions.push({
            id,
            data: { droppableContainer, value: 0 },
          })
        }
      }
    }

    return collisions
  }, [])

  // Active drag item state for DragOverlay
  const [activeDragItem, setActiveDragItem] = useState<{
    type: 'folder' | 'template'
    id: string
    name: string
  } | null>(null)

  // Folder dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [foldersToMove, setFoldersToMove] = useState<string[]>([])
  const [foldersToDelete, setFoldersToDelete] = useState<string[]>([])

  // Template dialog states
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] =
    useState(false)
  const [moveTemplateDialogOpen, setMoveTemplateDialogOpen] = useState(false)
  const [templateToMove, setTemplateToMove] = useState<TemplateListItem | null>(
    null
  )
  const [targetFolder, setTargetFolder] = useState<{
    id: string | null
    name: string
  } | null>(null)

  // Confirm folder move dialog state (for breadcrumb drops)
  const [confirmMoveFolderOpen, setConfirmMoveFolderOpen] = useState(false)
  const [folderToMove, setFolderToMove] = useState<Folder | null>(null)
  const [folderMoveTarget, setFolderMoveTarget] = useState<{
    id: string | null
    name: string
  } | null>(null)

  // Navigation state
  const {
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    isLoading: navLoading,
  } = useFolderNavigation(workspaceId ?? '')

  // Data fetching
  const {
    data: foldersData,
    isLoading: foldersLoading,
    refetch: refetchFolders,
  } = useFolders(workspaceId ?? null)

  // Refetch folders when navigating to a different folder
  useEffect(() => {
    refetchFolders()
  }, [currentFolderId, refetchFolders])

  const { data: templatesData, isLoading: templatesLoading } =
    useTemplatesByFolder(currentFolderId)

  // Mutations
  const moveFolder = useMoveFolder()
  const moveTemplate = useMoveTemplate()

  // Selection
  const { selectedIds, clearSelection, isSelecting, startSelecting } =
    useFolderSelection()

  // Filter folders for current directory
  const currentFolders =
    foldersData?.data.filter((f) =>
      currentFolderId ? f.parentId === currentFolderId : !f.parentId
    ) ?? []

  // Helper to get folder name by id
  const getFolderName = useCallback(
    (folderId: string | null): string => {
      if (!folderId) return t('templates.moveDialog.toRoot', 'Root')
      const folder = foldersData?.data.find((f) => f.id === folderId)
      return folder?.name ?? ''
    },
    [foldersData, t]
  )

  // Handle drag start - set active item for DragOverlay
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const type = active.data.current?.type

    if (type === 'folder') {
      setActiveDragItem({
        type: 'folder',
        id: active.data.current?.folder?.id,
        name: active.data.current?.folder?.name,
      })
    } else if (type === 'template') {
      setActiveDragItem({
        type: 'template',
        id: active.data.current?.template?.id,
        name: active.data.current?.template?.title,
      })
    }
  }, [])

  // Handle drag end for both folders and templates
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      // Always clear active drag item first
      setActiveDragItem(null)

      if (!over) return

      const dragType = active.data.current?.type
      const overType = over.data.current?.type

      if (dragType === 'folder') {
        // Handle folder drag
        const draggedFolder = active.data.current?.folder as Folder | undefined
        const targetFolderId = over.data.current?.folderId as
          | string
          | null
          | undefined

        if (!draggedFolder) return

        // Prevent dropping on itself
        if (draggedFolder.id === targetFolderId) return

        // Check if dropping on breadcrumb
        if (overType === 'breadcrumb') {
          // Prevent no-op (same parent)
          if (draggedFolder.parentId === targetFolderId) return

          // Show confirmation dialog
          setFolderToMove(draggedFolder)
          setFolderMoveTarget({
            id: targetFolderId ?? null,
            name: getFolderName(targetFolderId ?? null),
          })
          setConfirmMoveFolderOpen(true)
        } else if (targetFolderId && draggedFolder.id !== targetFolderId) {
          // Folder-to-folder drop (immediate move, existing behavior)
          try {
            await moveFolder.mutateAsync({
              folderId: draggedFolder.id,
              data: { parentId: targetFolderId },
            })
          } catch {
            // Error is handled by mutation
          }
        }
      } else if (dragType === 'template') {
        // Handle template drag - show confirmation dialog
        const template = active.data.current?.template as
          | TemplateListItem
          | undefined
        const targetFolderId = over.data.current?.folderId as
          | string
          | null
          | undefined

        // Only proceed if template exists and target is different from current
        if (template && targetFolderId !== template.folderId) {
          setTemplateToMove(template)
          setTargetFolder({
            id: targetFolderId ?? null,
            name: getFolderName(targetFolderId ?? null),
          })
          setMoveTemplateDialogOpen(true)
        }
      }
    },
    [moveFolder, getFolderName]
  )

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveDragItem(null)
  }, [])

  // Handle template move confirmation
  const handleConfirmMoveTemplate = async () => {
    if (!templateToMove || targetFolder === null) return

    try {
      await moveTemplate.mutateAsync({
        templateId: templateToMove.id,
        folderId: targetFolder.id,
      })
      setMoveTemplateDialogOpen(false)
      setTemplateToMove(null)
      setTargetFolder(null)
    } catch {
      // Error is handled by mutation
    }
  }

  // Handle folder move confirmation (for breadcrumb drops)
  const handleConfirmMoveFolder = async () => {
    if (!folderToMove || folderMoveTarget === null) return

    try {
      await moveFolder.mutateAsync({
        folderId: folderToMove.id,
        data: { parentId: folderMoveTarget.id },
      })
      setConfirmMoveFolderOpen(false)
      setFolderToMove(null)
      setFolderMoveTarget(null)
    } catch {
      // Error is handled by mutation
    }
  }

  // Handle folder actions
  const handleRenameFolder = (folder: Folder) => {
    setSelectedFolder(folder)
    setRenameDialogOpen(true)
  }

  const handleMoveFolder = (folder: Folder) => {
    setFoldersToMove([folder.id])
    setMoveDialogOpen(true)
  }

  const handleDeleteFolder = (folder: Folder) => {
    setFoldersToDelete([folder.id])
    setDeleteDialogOpen(true)
  }

  // Handle bulk actions
  const handleBulkDelete = () => {
    setFoldersToDelete(Array.from(selectedIds))
    setDeleteDialogOpen(true)
  }

  const handleBulkMove = () => {
    setFoldersToMove(Array.from(selectedIds))
    setMoveDialogOpen(true)
  }

  const handleDeleteSuccess = () => {
    clearSelection()
    setFoldersToDelete([])
  }

  const handleMoveSuccess = () => {
    clearSelection()
    setFoldersToMove([])
  }

  const isLoading = navLoading || foldersLoading || templatesLoading
  // Only show skeleton on initial load (no data yet), not during navigation
  const isInitialLoading = isLoading && !foldersData

  // Get folder names for delete dialog
  const folderNamesToDelete = foldersToDelete
    .map((id) => foldersData?.data.find((f) => f.id === id)?.name)
    .filter(Boolean) as string[]

  return (
    <div className="animate-page-enter flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('documents.header.label', 'Repository')}
            </div>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {t('documents.title', 'Document Explorer')}
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCreateTemplateDialogOpen(true)}
              className="group flex h-12 items-center gap-2 rounded-none bg-foreground px-6 text-sm font-medium tracking-wide text-background shadow-lg shadow-muted transition-colors hover:bg-foreground/90"
            >
              <span className="text-xl leading-none">+</span>
              <span>{t('templates.actions.newTemplate', 'NEW TEMPLATE')}</span>
            </button>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="group flex h-12 items-center gap-2 rounded-none border border-foreground bg-background px-6 text-sm font-medium tracking-wide text-foreground shadow-none transition-colors hover:bg-foreground hover:text-background"
            >
              <span className="text-xl leading-none">+</span>
              <span>{t('folders.actions.newFolder', 'NEW FOLDER')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <DocumentsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onStartSelection={startSelecting}
        isSelecting={isSelecting}
      />

      {/* Selection toolbar */}
      {isSelecting && selectedIds.size > 0 && (
        <SelectionToolbar
          onMove={handleBulkMove}
          onDelete={handleBulkDelete}
          totalCount={currentFolders.length}
          allFolderIds={currentFolders.map((f) => f.id)}
        />
      )}

      {/* Content with DnD context wrapping everything */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 overflow-y-auto px-4 pb-12 md:px-6 lg:px-6">
          {/* Droppable Breadcrumb */}
          <DroppableBreadcrumb
            items={breadcrumbs.map((b, i) => ({
              id: b.id,
              label: b.label,
              isActive: i === breadcrumbs.length - 1,
            }))}
            onNavigate={navigateToFolder}
          />

          {/* Animated content - skeleton y contenido dentro de AnimatePresence */}
          <AnimatePresence mode="wait">
            {isInitialLoading || !minLoadingComplete ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-10"
              >
                <h2 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t('folders.subfolders', 'Subfolders')}
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentFolderId ?? 'root'}
                variants={gridContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Folders section */}
                <div className="mb-10">
                  <h2 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t('folders.subfolders', 'Subfolders')}
                  </h2>

                  {currentFolders.length === 0 ? (
                    <p className="text-muted-foreground">
                      {t(
                        'folders.empty',
                        'No folders yet. Create one to get started.'
                      )}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      <AnimatePresence initial={false} mode="popLayout">
                        {currentFolders.map((folder) => (
                          <motion.div
                            key={folder.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                          >
                            <DroppableFolderZone folderId={folder.id}>
                              <DraggableFolderCard
                                folder={folder}
                                disabled={isSelecting}
                                isOtherDragging={activeDragItem !== null}
                              >
                                <FolderCard
                                  folder={folder}
                                  onClick={() => navigateToFolder(folder.id)}
                                  onRename={() => handleRenameFolder(folder)}
                                  onMove={() => handleMoveFolder(folder)}
                                  onDelete={() => handleDeleteFolder(folder)}
                                />
                              </DraggableFolderCard>
                            </DroppableFolderZone>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Templates section */}
                <div className="mb-10">
                  <h2 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t('templates.section', 'Templates')}
                  </h2>

                  {!templatesData?.items || templatesData.items.length === 0 ? (
                    <p className="text-muted-foreground">
                      {t('templates.empty', 'No templates in this folder')}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      <AnimatePresence initial={false} mode="popLayout">
                        {templatesData.items.map((template) => (
                          <motion.div
                            key={template.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                          >
                            <DraggableTemplateCard
                              template={template}
                              disabled={isSelecting}
                              isOtherDragging={activeDragItem !== null}
                            >
                              <TemplateCard
                                template={template}
                                onClick={() => {
                                  navigate({
                                    to: '/workspace/$workspaceId/templates/$templateId',
                                    /* eslint-disable @typescript-eslint/no-explicit-any -- TanStack Router type limitation */
                                    params: { workspaceId: workspaceId ?? '', templateId: template.id } as any,
                                    search: { fromFolderId: currentFolderId ?? 'root' } as any,
                                    /* eslint-enable @typescript-eslint/no-explicit-any */
                                  })
                                }}
                              />
                            </DraggableTemplateCard>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drag Overlay - shows custom preview while dragging */}
        <DragOverlay dropAnimation={null} modifiers={[snapBelowCursor]}>
          {activeDragItem && (
            <DragPreview
              type={activeDragItem.type}
              name={activeDragItem.name}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Folder Dialogs */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentId={currentFolderId}
      />

      <RenameFolderDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        folder={selectedFolder}
      />

      <DeleteFolderDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        folderIds={foldersToDelete}
        folderNames={folderNamesToDelete}
        onSuccess={handleDeleteSuccess}
      />

      <MoveFolderDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        folderIds={foldersToMove}
        workspaceId={workspaceId ?? ''}
        onSuccess={handleMoveSuccess}
      />

      {/* Template Create Dialog */}
      <CreateTemplateDialog
        open={createTemplateDialogOpen}
        onOpenChange={setCreateTemplateDialogOpen}
        folderId={currentFolderId}
      />

      {/* Template Move Dialog */}
      <MoveTemplateDialog
        open={moveTemplateDialogOpen}
        onOpenChange={setMoveTemplateDialogOpen}
        template={templateToMove}
        targetFolderName={targetFolder?.name ?? ''}
        onConfirm={handleConfirmMoveTemplate}
        isLoading={moveTemplate.isPending}
      />

      {/* Confirm Folder Move Dialog (for breadcrumb drops) */}
      <ConfirmMoveFolderDialog
        open={confirmMoveFolderOpen}
        onOpenChange={setConfirmMoveFolderOpen}
        folder={folderToMove}
        targetFolderName={folderMoveTarget?.name ?? ''}
        onConfirm={handleConfirmMoveFolder}
        isLoading={moveFolder.isPending}
      />
    </div>
  )
}

export function DocumentsPage() {
  return (
    <FolderSelectionProvider>
      <DocumentsPageContent />
    </FolderSelectionProvider>
  )
}
