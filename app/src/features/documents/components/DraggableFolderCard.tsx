import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { Folder } from '@/types/api'

interface DraggableFolderCardProps {
  folder: Folder
  children: React.ReactNode
  disabled?: boolean
  isOtherDragging?: boolean
}

export function DraggableFolderCard({
  folder,
  children,
  disabled = false,
  isOtherDragging = false,
}: DraggableFolderCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `folder-${folder.id}`,
    data: {
      type: 'folder',
      folder,
    },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'touch-none transition-opacity',
        isDragging && 'z-50 opacity-0',
        isOtherDragging && !isDragging && 'opacity-40'
      )}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  )
}
