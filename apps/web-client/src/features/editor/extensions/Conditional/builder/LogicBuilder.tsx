import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { useDraggable } from '@dnd-kit/core'
import { GripVertical, Variable, Search, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type {
  LogicGroup,
  LogicRule,
  ConditionalSchema,
  RuleValue,
} from '../ConditionalExtension'
import { LogicBuilderContext } from './LogicBuilderContext'
import { LogicGroupItem } from './LogicGroup'
import { FormulaSummary } from './FormulaSummary'
import type { InjectorType } from '../../../types/variables'
import { useInjectablesStore } from '../../../stores/injectables-store'
import {
  Calendar,
  CheckSquare,
  Coins,
  Hash,
  Image as ImageIcon,
  Table,
  Type,
} from 'lucide-react'

const ICONS: Record<InjectorType, typeof Type> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
  ROLE_TEXT: Type,
}

const ALLOWED_TYPES: InjectorType[] = [
  'TEXT',
  'NUMBER',
  'CURRENCY',
  'DATE',
  'BOOLEAN',
]

// Pure function - moved outside component for better memoization
const updateNodeRecursively = (
  current: LogicGroup,
  nodeId: string,
  changes: Partial<LogicRule | LogicGroup>
): LogicGroup => {
  if (current.id === nodeId) {
    return { ...current, ...changes } as LogicGroup
  }
  return {
    ...current,
    children: current.children.map((child) => {
      if (child.id === nodeId) {
        return { ...child, ...changes } as LogicRule | LogicGroup
      }
      if (child.type === 'group') {
        return updateNodeRecursively(child as LogicGroup, nodeId, changes)
      }
      return child
    }),
  }
}

interface LogicBuilderProps {
  initialData: ConditionalSchema
  onChange: (data: ConditionalSchema) => void
}

export const LogicBuilder = ({ initialData, onChange }: LogicBuilderProps) => {
  const { t } = useTranslation()
  const [data, setData] = useState<ConditionalSchema>(
    initialData || {
      id: 'root',
      type: 'group',
      logic: 'AND',
      children: [],
    }
  )
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Get variables from store
  const { variables: storeVariables, isLoading } = useInjectablesStore()

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor)
  )

  // Map store variables to LogicBuilder format and filter by allowed types
  const allVariables = useMemo(() => {
    return storeVariables
      .filter((v) => ALLOWED_TYPES.includes(v.type))
      .map((v) => ({
        id: v.variableId,
        label: v.label,
        type: v.type,
      }))
  }, [storeVariables])

  const filteredVariables = useMemo(() => {
    if (!searchQuery.trim()) return allVariables
    const lowerQuery = searchQuery.toLowerCase()
    return allVariables.filter((v) =>
      v.label.toLowerCase().includes(lowerQuery)
    )
  }, [allVariables, searchQuery])

  // --- ACTIONS ---

  const updateNode = useCallback(
    (nodeId: string, changes: Partial<LogicRule | LogicGroup>) => {
      const newData = updateNodeRecursively(data, nodeId, changes)
      setData(newData)
      onChange(newData)
    },
    [data, onChange]
  )

  const addRule = useCallback(
    (parentId: string) => {
      const newRule: LogicRule = {
        id: uuidv4(),
        type: 'rule',
        variableId: '',
        operator: 'eq',
        value: { mode: 'text', value: '' } as RuleValue,
      }
      // Helper to insert
      const insertInto = (group: LogicGroup): LogicGroup => {
        if (group.id === parentId) {
          return { ...group, children: [...group.children, newRule] }
        }
        return {
          ...group,
          children: group.children.map((c) =>
            c.type === 'group' ? insertInto(c as LogicGroup) : c
          ),
        }
      }
      const newData = insertInto(data)
      setData(newData)
      onChange(newData)
    },
    [data, onChange]
  )

  const addGroup = useCallback(
    (parentId: string) => {
      const newGroup: LogicGroup = {
        id: uuidv4(),
        type: 'group',
        logic: 'AND',
        children: [],
      }
      const insertInto = (group: LogicGroup): LogicGroup => {
        if (group.id === parentId) {
          return { ...group, children: [...group.children, newGroup] }
        }
        return {
          ...group,
          children: group.children.map((c) =>
            c.type === 'group' ? insertInto(c as LogicGroup) : c
          ),
        }
      }
      const newData = insertInto(data)
      setData(newData)
      onChange(newData)
    },
    [data, onChange]
  )

  const removeNode = useCallback(
    (nodeId: string, parentId: string) => {
      const removeFrom = (group: LogicGroup): LogicGroup => {
        if (group.id === parentId) {
          return {
            ...group,
            children: group.children.filter((c) => c.id !== nodeId),
          }
        }
        return {
          ...group,
          children: group.children.map((c) =>
            c.type === 'group' ? removeFrom(c as LogicGroup) : c
          ),
        }
      }
      const newData = removeFrom(data)
      setData(newData)
      onChange(newData)
    },
    [data, onChange]
  )

  // --- DRAG HANDLERS ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    if (!over) return

    // Check if dropped on a rule variable field
    // ID format: rule-var-{ruleId}
    if (over.id.toString().startsWith('rule-var-')) {
      const ruleId = over.id.toString().replace('rule-var-', '')
      const variableId = active.id.toString()
      updateNode(ruleId, {
        variableId,
        value: { mode: 'text', value: '' } as RuleValue,
        operator: 'eq',
      }) // Reset value/op on change
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[snapCenterToCursor]}
    >
      <LogicBuilderContext.Provider
        value={{
          variables: allVariables,
          updateNode,
          addRule,
          addGroup,
          removeNode,
        }}
      >
        <div className="flex flex-row h-full bg-background overflow-hidden">
          {/* Sidebar */}
          <div className="w-52 border-r border-border bg-muted flex flex-col shrink-0">
            <div className="p-3 border-b border-border font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Variable className="h-3.5 w-3.5" /> Variables
            </div>

            {/* Search Bar */}
            <div className="p-3 pb-0">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('editor.conditional.search')}
                  className="pl-8 h-9 border-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {isLoading && (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-xs">{t('editor.conditional.loading')}</span>
                  </div>
                )}
                {!isLoading &&
                  filteredVariables.map((v) => (
                    <DraggableVar
                      key={v.id}
                      id={v.id}
                      label={v.label}
                      type={v.type}
                    />
                  ))}
                {!isLoading && filteredVariables.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    {t('editor.conditional.noVariablesFound')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Builder Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden bg-muted/50">
              <LogicGroupItem group={data} />
            </div>

            {/* Formula Summary */}
            <div className="border-t border-border p-3 bg-card">
              <FormulaSummary schema={data} />
            </div>
          </div>
        </div>

        <DragOverlay zIndex={100} dropAnimation={null}>
          {activeDragId ? (
            <DraggingItem id={activeDragId} variables={allVariables} />
          ) : null}
        </DragOverlay>
      </LogicBuilderContext.Provider>
    </DndContext>
  )
}

interface DraggingItemProps {
  id: string
  variables: { id: string; label: string; type: InjectorType }[]
}

const DraggingItem = ({ id, variables }: DraggingItemProps) => {
  const v = variables.find((v) => v.id === id)
  if (!v) return null
  const Icon = ICONS[v.type] || Type

  return (
    <div className="flex items-center gap-2 p-2 text-xs border border-border rounded-sm bg-card shadow-md cursor-grabbing z-[100]">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{v.label}</span>
    </div>
  )
}

const DraggableVar = ({
  id,
  label,
  type,
}: {
  id: string
  label: string
  type: InjectorType
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
    data: { type: 'variable', id },
  })

  const Icon = ICONS[type] || Type

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 p-2 text-xs border border-border rounded-sm bg-card cursor-grab hover:bg-muted transition-colors group select-none',
        isDragging ? 'opacity-30' : ''
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{label}</span>
    </div>
  )
}
