import { useDroppable } from '@dnd-kit/core'
import { ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const breadcrumbItemVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
}

interface BreadcrumbItem {
  id: string | null // null = root
  label: string
  isActive?: boolean
}

interface DroppableBreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (folderId: string | null) => void
}

export function DroppableBreadcrumb({
  items,
  onNavigate,
}: DroppableBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 py-6 font-mono text-sm text-muted-foreground">
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item, i) => (
          <motion.div key={item.id ?? 'root'} className="contents">
            {i > 0 && (
              <motion.span
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChevronRight size={14} className="text-muted-foreground/50" />
              </motion.span>
            )}
            <motion.div
              layout
              variants={breadcrumbItemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <DroppableBreadcrumbItem
                id={item.id}
                label={item.label}
                isActive={item.isActive}
                onNavigate={onNavigate}
              />
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </nav>
  )
}

interface DroppableBreadcrumbItemProps {
  id: string | null
  label: string
  isActive?: boolean
  onNavigate: (id: string | null) => void
}

function DroppableBreadcrumbItem({
  id,
  label,
  isActive,
  onNavigate,
}: DroppableBreadcrumbItemProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `breadcrumb-${id ?? 'root'}`,
    data: {
      type: 'breadcrumb',
      folderId: id,
    },
  })

  // Check what type is being dragged
  const isDraggingFolder = active?.data.current?.type === 'folder'
  const isDraggingTemplate = active?.data.current?.type === 'template'

  // Get current parent/folder of dragged item
  const draggedFolderParentId = active?.data.current?.folder?.parentId
  const draggedTemplateFolderId = active?.data.current?.template?.folderId

  // Folder valid: not dropping in same parent, not on active breadcrumb
  const isValidFolderDrop =
    isDraggingFolder && draggedFolderParentId !== id && !isActive

  // Template valid: not dropping in same folder, not on active breadcrumb
  const isValidTemplateDrop =
    isDraggingTemplate && draggedTemplateFolderId !== id && !isActive

  const isValidDrop = isValidFolderDrop || isValidTemplateDrop

  if (isActive) {
    return (
      <span
        ref={setNodeRef}
        className="border-b border-foreground font-medium text-foreground"
      >
        {label}
      </span>
    )
  }

  return (
    <button
      ref={setNodeRef}
      onClick={() => onNavigate(id)}
      className={cn(
        'cursor-pointer border-none bg-transparent px-2 py-1 transition-all hover:text-foreground',
        isOver &&
          isValidDrop &&
          'rounded bg-primary/10 text-primary ring-2 ring-primary'
      )}
    >
      {label}
    </button>
  )
}
