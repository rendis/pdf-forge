import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { TemplateListItem } from '@/types/api'

interface DraggableTemplateCardProps {
  template: TemplateListItem
  children: React.ReactNode
  disabled?: boolean
  isOtherDragging?: boolean
}

export function DraggableTemplateCard({
  template,
  children,
  disabled = false,
  isOtherDragging = false,
}: DraggableTemplateCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: {
      type: 'template',
      template,
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
