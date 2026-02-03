import { Plus, Trash2, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LogicGroup, LogicRule } from '../ConditionalExtension'
import { LogicRuleItem } from './LogicRule'
import { useLogicBuilder } from './LogicBuilderContext'

const MAX_NESTING_LEVEL = 3

// Fondos por nivel (sin indentación, solo color)
const BG_LEVELS = [
  'bg-transparent',
  'bg-muted/30',
  'bg-muted/50 dark:bg-muted/40',
  'bg-muted/70 dark:bg-muted/50'
]

interface LogicGroupProps {
  group: LogicGroup
  parentId?: string
  level?: number
}

export const LogicGroupItem = ({
  group,
  parentId,
  level = 0,
}: LogicGroupProps) => {
  const { t } = useTranslation()
  const { addRule, addGroup, updateNode, removeNode } = useLogicBuilder()

  const isRoot = !parentId

  // Color del borde según operador lógico
  const borderColor =
    group.logic === 'AND' ? 'border-l-foreground' : 'border-l-amber-500 dark:border-l-amber-600'

  // Fondo según nivel
  const bgLevel = BG_LEVELS[level] || BG_LEVELS[BG_LEVELS.length - 1]

  return (
    <div
      className={cn(
        'flex flex-col gap-2 transition-colors',
        !isRoot && 'border-l-4 rounded-r-sm p-3 my-1',
        !isRoot && borderColor,
        bgLevel
      )}
    >
      {/* Group Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex rounded-sm border border-border bg-card overflow-hidden p-0.5">
            <button
              type="button"
              onClick={() => updateNode(group.id, { logic: 'AND' })}
              className={cn(
                'px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wider rounded-sm transition-all',
                group.logic === 'AND'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => updateNode(group.id, { logic: 'OR' })}
              className={cn(
                'px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wider rounded-sm transition-all',
                group.logic === 'OR'
                  ? 'bg-amber-500 dark:bg-amber-600 text-white'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              OR
            </button>
          </div>
        </div>

        {!isRoot && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeNode(group.id, parentId!)}
            className="h-7 w-7 text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Children - Sin padding-left adicional */}
      <div className="flex flex-col gap-2">
        {group.children.length === 0 && (
          <div className="text-xs text-muted-foreground italic py-2">
            {t('editor.conditional.emptyGroup')}
          </div>
        )}

        {group.children.map((child) =>
          child.type === 'group' ? (
            <LogicGroupItem
              key={child.id}
              group={child}
              parentId={group.id}
              level={level + 1}
            />
          ) : (
            <LogicRuleItem
              key={child.id}
              rule={child as LogicRule}
              parentId={group.id}
            />
          )
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-2 mt-1 opacity-70 hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            className="h-7 font-mono text-[10px] uppercase tracking-wider border-border"
            onClick={() => addRule(group.id)}
          >
            <Plus className="h-3 w-3 mr-1" /> {t('editor.conditional.rule')}
          </Button>
          {level < MAX_NESTING_LEVEL - 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 font-mono text-[10px] uppercase tracking-wider"
              onClick={() => addGroup(group.id)}
            >
              <Layers className="h-3 w-3 mr-1" /> {t('editor.conditional.group')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
