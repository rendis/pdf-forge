import { createElement, memo, useState } from 'react'
import { motion, type Transition } from 'framer-motion'
import { ChevronRight, FolderOpen, type LucideIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InjectableGroup } from '../types/injectable-group'
import type { Variable } from '../types/variables'
import type { VariableDragData } from '../types/drag'
import { DraggableVariable } from './DraggableVariable'

const COLLAPSE_TRANSITION: Transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] }

/**
 * Convert kebab-case or snake_case icon name to PascalCase for Lucide lookup.
 * e.g., "calendar" -> "Calendar", "folder-open" -> "FolderOpen"
 */
function toIconComponentName(iconName: string): string {
  return iconName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

/**
 * Get Lucide icon component by name.
 * Falls back to FolderOpen if icon not found.
 */
function getIconComponent(iconName: string): LucideIcon {
  const componentName = toIconComponentName(iconName)
  const icon = (LucideIcons as Record<string, LucideIcon>)[componentName]
  return icon ?? FolderOpen
}

/**
 * Dynamic icon renderer component.
 * Uses createElement to render the icon component dynamically.
 */
const DynamicIcon = memo(function DynamicIcon({
  iconName,
  className,
}: {
  iconName: string
  className?: string
}) {
  // Use createElement to avoid React Compiler warnings about dynamic components
  return createElement(getIconComponent(iconName), { className })
})

/**
 * Default color scheme for all groups.
 * Neutral colors that work well with any group.
 */
const DEFAULT_COLORS = {
  text: 'text-muted-foreground',
  bg: 'bg-muted/30',
  badge: 'bg-muted text-muted-foreground',
}

interface VariableGroupProps {
  /** Group definition with name, icon, and order */
  group: InjectableGroup
  /** Variables belonging to this group */
  variables: Variable[]
  /** Optional click handler for variables */
  onVariableClick?: (data: VariableDragData) => void
  /** IDs of currently dragging items (for visual feedback) */
  draggingIds?: string[]
  /** Controlled open state (if provided, component becomes controlled) */
  isOpen?: boolean
  /** Callback when open state changes (for controlled mode) */
  onOpenChange?: (isOpen: boolean) => void
  /** Initial collapsed state for uncontrolled mode (default: true = collapsed) */
  defaultCollapsed?: boolean
}

/**
 * Collapsible group container for variables in the VariablesPanel.
 *
 * Features:
 * - Animated collapse/expand with chevron rotation
 * - Dynamic icon from Lucide based on group.icon
 * - Badge showing variable count
 * - Smooth height animation
 *
 * Visual design:
 * ```
 * +-----------------------------------+
 * | > [icon] Date/Time          [6]  | <- Group header (clickable)
 * |   +-- Current Date               | <- Variables (indented)
 * |   +-- Current Time               |
 * |   +-- Year Now                   |
 * +-----------------------------------+
 * ```
 */
export function VariableGroup({
  group,
  variables,
  onVariableClick,
  draggingIds = [],
  isOpen: controlledIsOpen,
  onOpenChange,
  defaultCollapsed = true,
}: VariableGroupProps) {
  // Support both controlled and uncontrolled modes
  const [internalIsOpen, setInternalIsOpen] = useState(!defaultCollapsed)
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const handleToggle = () => {
    const newValue = !isOpen
    if (isControlled) {
      onOpenChange?.(newValue)
    } else {
      setInternalIsOpen(newValue)
    }
  }

  const colors = DEFAULT_COLORS

  // Convert Variable to VariableDragData
  const mapVariableToDragData = (v: Variable): VariableDragData => ({
    id: v.variableId,
    itemType: 'variable',
    variableId: v.variableId,
    label: v.label,
    injectorType: v.type,
    formatConfig: v.formatConfig,
    sourceType: v.sourceType,
    description: v.description,
  })

  if (variables.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 min-w-0">
      {/* Group header button */}
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest w-full transition-colors',
          colors.text,
          `hover:opacity-80`
        )}
      >
        {/* Chevron with rotation animation */}
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={COLLAPSE_TRANSITION}
        >
          <ChevronRight className="h-3 w-3" />
        </motion.div>

        {/* Group icon */}
        <DynamicIcon iconName={group.icon} className="h-3 w-3" />

        {/* Group name */}
        <span>{group.name}</span>

        {/* Variable count badge */}
        <span
          className={cn(
            'ml-auto text-[9px] px-1.5 rounded',
            colors.badge
          )}
        >
          {variables.length}
        </span>
      </button>

      {/* Collapsible content */}
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={COLLAPSE_TRANSITION}
        style={{ overflow: 'hidden' }}
      >
        <div className="space-y-2 pt-2 min-w-0">
          {variables.map((v) => (
            <DraggableVariable
              key={v.variableId}
              data={mapVariableToDragData(v)}
              onClick={onVariableClick}
              isDragging={draggingIds.includes(v.variableId)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
