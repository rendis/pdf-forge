import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DroppableFolderZoneProps {
  folderId: string
  children: React.ReactNode
}

export function DroppableFolderZone({
  folderId,
  children,
}: DroppableFolderZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `drop-folder-${folderId}`,
    data: {
      type: 'folder',
      folderId,
    },
  })

  // Prevent dropping onto itself
  const draggedFolderId = active?.data.current?.folder?.id
  const isValidDrop = draggedFolderId !== folderId

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-200',
        isOver && isValidDrop && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {children}
    </div>
  )
}
