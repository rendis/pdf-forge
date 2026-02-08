import { cn } from '@/lib/utils'
import { GripVertical, Settings2 } from 'lucide-react'
import { VARIABLE_ICONS } from '../extensions/Mentions/variables'
import type { VariableDragData } from '../types/drag'

interface VariableDragOverlayProps {
  data: VariableDragData
}

const OVERLAY_SOURCE_TYPE_STYLES: Record<'INTERNAL' | 'EXTERNAL' | 'default', string> = {
  INTERNAL: 'border-internal-border/60 bg-internal-muted/90 text-internal-foreground',
  EXTERNAL: 'border-external-border/60 bg-external-muted/90 text-external-foreground',
  default: 'border-border/80 bg-muted/90 text-foreground',
}

function getOverlaySourceTypeStyles(sourceType?: 'INTERNAL' | 'EXTERNAL'): string {
  return OVERLAY_SOURCE_TYPE_STYLES[sourceType ?? 'default']
}

/**
 * Ghost image shown while dragging a variable from the VariablesPanel
 * Displays the variable with icon, label, and visual feedback
 */
export function VariableDragOverlay({ data }: VariableDragOverlayProps) {
  const Icon = VARIABLE_ICONS[data.injectorType]

  const hasConfigurableOptions =
    data.formatConfig?.options && data.formatConfig.options.length > 1

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-card shadow-lg cursor-grabbing z-100',
        getOverlaySourceTypeStyles(data.sourceType)
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{data.label}</span>

      {hasConfigurableOptions && (
        <Settings2 className="h-3 w-3 text-muted-foreground shrink-0" />
      )}

      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 ml-auto">
        {data.injectorType}
      </span>
    </div>
  )
}
