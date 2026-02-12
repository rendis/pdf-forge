import { useDraggable } from '@dnd-kit/core'
import { VARIABLE_ICONS } from '../extensions/Mentions/variables'
import { GripVertical, Settings2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { VariableDragData } from '../types/drag'
import { hasConfigurableOptions } from '../types/injectable'

interface DraggableVariableProps {
  /**
   * Variable data to be dragged/clicked
   */
  data: VariableDragData

  /**
   * Optional click handler for click-to-insert functionality
   * If provided, clicking the variable will call this handler instead of initiating drag
   */
  onClick?: (data: VariableDragData) => void

  /**
   * Whether the variable is currently being dragged
   */
  isDragging?: boolean

  /**
   * Hide the drag handle icon (GripVertical)
   * Useful for modal contexts where drag-and-drop is not available
   */
  hideDragHandle?: boolean
}

const SOURCE_TYPE_STYLES: Record<'INTERNAL' | 'EXTERNAL' | 'default', string> = {
  INTERNAL: 'border-internal-border/50 bg-internal-muted/30 hover:bg-internal-muted/60 text-internal-foreground',
  EXTERNAL: 'border-external-border/50 bg-external-muted/30 hover:bg-external-muted/60 text-external-foreground',
  default: 'border-border hover:bg-muted/50 hover:border-border/80',
}

const SOURCE_TYPE_ICON_COLORS: Record<'INTERNAL' | 'EXTERNAL' | 'default', { active: string; inactive: string }> = {
  INTERNAL: { active: 'text-internal-foreground', inactive: 'text-internal-foreground/70' },
  EXTERNAL: { active: 'text-external-foreground', inactive: 'text-external-foreground/70' },
  default: { active: 'text-foreground', inactive: 'text-muted-foreground' },
}

function getSourceTypeStyles(sourceType?: 'INTERNAL' | 'EXTERNAL'): string {
  return SOURCE_TYPE_STYLES[sourceType ?? 'default']
}

function getSourceTypeIconColor(sourceType?: 'INTERNAL' | 'EXTERNAL', isActive?: boolean): string {
  const colors = SOURCE_TYPE_ICON_COLORS[sourceType ?? 'default']
  return isActive ? colors.active : colors.inactive
}

/**
 * Draggable item for a single variable in the VariablesPanel
 * Supports both drag-and-drop and click-to-insert interactions
 *
 * Visual design:
 * - Icon based on variable type
 * - Gear icon for configurable format options
 * - Color differentiation by source type
 * - Source type icons for internal/external variables
 * - Type badge for regular variables
 * - Hover and active states for better UX
 */
export function DraggableVariable({
  data,
  onClick,
  isDragging = false,
  hideDragHandle = false,
}: DraggableVariableProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: data.id,
    data: data,
  })

  const Icon = VARIABLE_ICONS[data.injectorType] || VARIABLE_ICONS.TEXT
  const hasOptions = hasConfigurableOptions(data.formatConfig)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(data)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-card shadow-sm cursor-grab hover:shadow-md transition-all group select-none w-full min-w-0 overflow-hidden',
        getSourceTypeStyles(data.sourceType),
        // Reduced opacity while dragging
        isDragging && 'opacity-30 cursor-grabbing'
      )}
    >
      {/* Drag handle */}
      {!hideDragHandle && (
        <GripVertical
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            getSourceTypeIconColor(data.sourceType)
          )}
        />
      )}

      {/* Type icon */}
      <Icon
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          getSourceTypeIconColor(data.sourceType)
        )}
      />

      {/* Variable label with tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate font-medium flex-1 min-w-0">{data.label}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{data.label}</TooltipContent>
      </Tooltip>

      {/* Gear icon for configurable format options */}
      {hasOptions && (
        <Settings2
          className={cn(
            'h-3 w-3 shrink-0',
            getSourceTypeIconColor(data.sourceType)
          )}
        />
      )}

      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
        {data.injectorType}
      </span>

      {/* Info icon with full details tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-0.5 hover:bg-muted/50 rounded transition-colors"
          >
            <Info className="h-3 w-3 text-muted-foreground/70" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          align="start"
          collisionPadding={16}
          className="w-[280px] p-0"
        >
          <div className="divide-y divide-border">
            {/* Name - scrollable si +3 líneas */}
            <div className="px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Name
              </span>
              <p className="text-sm font-medium break-words max-h-[60px] overflow-y-auto">
                {data.label}
              </p>
            </div>

            {/* Key - scrollable si +3 líneas */}
            <div className="px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Key
              </span>
              <p className="font-mono text-xs break-all max-h-[60px] overflow-y-auto">
                {data.variableId}
              </p>
            </div>

            {/* Description - scrollable si +3 líneas */}
            {data.description && (
              <div className="px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Description
                </span>
                <p className="text-xs break-words max-h-[60px] overflow-y-auto">
                  {data.description}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
