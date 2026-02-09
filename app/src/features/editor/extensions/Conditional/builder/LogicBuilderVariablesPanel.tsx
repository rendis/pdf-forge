import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Database,
  Loader2,
  Search,
  Variable as VariableIcon,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useInjectablesStore } from '../../../stores/injectables-store'
import type { Variable } from '../../../types/variables'
import type { InjectorType } from '../../../types/variables'
import type { VariableDragData } from '../../../types/drag'
import { DraggableVariable } from '../../../components/DraggableVariable'
import { VariableGroup } from '../../../components/VariableGroup'

const COLLAPSE_TRANSITION: Transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] }

const ALLOWED_TYPES: InjectorType[] = [
  'TEXT',
  'NUMBER',
  'CURRENCY',
  'DATE',
  'BOOLEAN',
]

interface LogicBuilderVariablesPanelProps {
  className?: string
}

export function LogicBuilderVariablesPanel({
  className,
}: LogicBuilderVariablesPanelProps) {
  const { t } = useTranslation()

  const storeVariables = useInjectablesStore((s) => s.variables)
  const groups = useInjectablesStore((s) => s.groups)
  const isLoading = useInjectablesStore((s) => s.isLoading)

  const [searchQuery, setSearchQuery] = useState('')
  const [variablesFilter, setVariablesFilter] = useState<'all' | 'internal' | 'external'>('all')

  const [internalSectionOpen, setInternalSectionOpen] = useState(false)
  const [externalSectionOpen, setExternalSectionOpen] = useState(false)
  const [groupOpenStates, setGroupOpenStates] = useState<Record<string, boolean>>({})

  // Pre-filter by allowed types
  const allowedVariables = useMemo(
    () => storeVariables.filter((v) => ALLOWED_TYPES.includes(v.type)),
    [storeVariables],
  )

  const allSectionsExpanded = useMemo(() => {
    const hasUngroupedExternal = allowedVariables.some(v => v.sourceType === 'EXTERNAL' && !v.group)
    const hasUngroupedInternal = allowedVariables.some(v => v.sourceType === 'INTERNAL' && !v.group)
    const groupKeys = groups.map(g => g.key)
    const sectionsOpen = [
      !hasUngroupedExternal || externalSectionOpen,
      !hasUngroupedInternal || internalSectionOpen,
      ...groupKeys.map(key => groupOpenStates[key] ?? false),
    ]
    return sectionsOpen.every(Boolean)
  }, [externalSectionOpen, internalSectionOpen, groupOpenStates, allowedVariables, groups])

  const isSearching = searchQuery.trim().length > 0

  useEffect(() => {
    if (isSearching) {
      setExternalSectionOpen(true)
      setInternalSectionOpen(true)
      setGroupOpenStates(prev => {
        const newStates = { ...prev }
        for (const group of groups) {
          newStates[group.key] = true
        }
        return newStates
      })
    }
  }, [isSearching, groups])

  const toggleAllSections = useCallback(() => {
    const newState = !allSectionsExpanded
    setExternalSectionOpen(newState)
    setInternalSectionOpen(newState)
    setGroupOpenStates(prev => {
      const newStates = { ...prev }
      for (const group of groups) {
        newStates[group.key] = newState
      }
      return newStates
    })
  }, [allSectionsExpanded, groups])

  const handleGroupOpenChange = useCallback((groupKey: string, isOpen: boolean) => {
    setGroupOpenStates(prev => ({ ...prev, [groupKey]: isOpen }))
  }, [])

  const collapseAllSections = useCallback(() => {
    setExternalSectionOpen(false)
    setInternalSectionOpen(false)
    setGroupOpenStates({})
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    collapseAllSections()
  }, [collapseAllSections])

  const handleSearchChange = useCallback((value: string) => {
    const wasSearching = searchQuery.trim().length > 0
    const willBeEmpty = value.trim().length === 0
    setSearchQuery(value)
    if (wasSearching && willBeEmpty) {
      collapseAllSections()
    }
  }, [searchQuery, collapseAllSections])

  const lowerSearchQuery = searchQuery.toLowerCase().trim()

  const { groupedVariables, ungroupedInternal, ungroupedExternal } = useMemo(() => {
    const filterBySourceType = (sourceType: 'INTERNAL' | 'EXTERNAL', excludeFilter: 'internal' | 'external'): Variable[] => {
      if (variablesFilter === excludeFilter) return []
      const filtered = allowedVariables.filter(v => v.sourceType === sourceType)
      if (!lowerSearchQuery) return filtered
      return filtered.filter(
        (v) =>
          v.label.toLowerCase().includes(lowerSearchQuery) ||
          v.variableId.toLowerCase().includes(lowerSearchQuery)
      )
    }

    const internalVars = filterBySourceType('INTERNAL', 'external')
    const externalVars = filterBySourceType('EXTERNAL', 'internal')
    const allVars = [...internalVars, ...externalVars]

    const grouped = new Map<string, Variable[]>()
    const ungroupedInternal: Variable[] = []
    const ungroupedExternal: Variable[] = []

    for (const variable of allVars) {
      if (variable.group) {
        const existing = grouped.get(variable.group) || []
        grouped.set(variable.group, [...existing, variable])
      } else if (variable.sourceType === 'INTERNAL') {
        ungroupedInternal.push(variable)
      } else {
        ungroupedExternal.push(variable)
      }
    }

    const sortedGrouped = Array.from(grouped.entries())
      .sort((a, b) => {
        const groupA = groups.find(g => g.key === a[0])
        const groupB = groups.find(g => g.key === b[0])
        return (groupA?.order ?? 99) - (groupB?.order ?? 99)
      })

    return { groupedVariables: sortedGrouped, ungroupedInternal, ungroupedExternal }
  }, [allowedVariables, groups, variablesFilter, lowerSearchQuery])

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

  const totalGrouped = groupedVariables.reduce((acc, [, vars]) => acc + vars.length, 0)
  const totalCount = totalGrouped + ungroupedInternal.length + ungroupedExternal.length

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex flex-col border-r border-border bg-card shrink-0 overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center h-12 px-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <VariableIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {t('editor.variablesPanel.header')}
            </span>
          </div>

          <span className="text-xs text-muted-foreground/70 min-w-[1ch] text-center">
            {totalCount}
          </span>

          <button
            onClick={toggleAllSections}
            className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors ml-1"
            aria-label={allSectionsExpanded ? t('editor.variablesPanel.collapseAll') : t('editor.variablesPanel.expandAll')}
            title={allSectionsExpanded ? t('editor.variablesPanel.collapseAll') : t('editor.variablesPanel.expandAll')}
          >
            {allSectionsExpanded ? (
              <ChevronsDownUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 p-3 pb-2">
          <div className="relative min-w-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('editor.variablesPanel.search.placeholder')}
              className="pl-8 pr-8 h-9"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <AnimatePresence>
              {searchQuery.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleClearSearch}
                  className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('common.clear')}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="px-3 pb-2">
          <div className="flex rounded-none border border-border bg-background p-0.5">
            <button
              onClick={() => setVariablesFilter('internal')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
                variablesFilter === 'internal'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Clock className="h-3 w-3" />
              Internal
            </button>
            <button
              onClick={() => setVariablesFilter('all')}
              className={cn(
                'flex-1 flex items-center justify-center px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
                variablesFilter === 'all'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            <button
              onClick={() => setVariablesFilter('external')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
                variablesFilter === 'external'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Database className="h-3 w-3" />
              External
            </button>
          </div>
        </div>

        {/* Scrollable variable list */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-10 pointer-events-none z-10 flex flex-col">
            <div className="h-4 bg-card" />
            <div className="h-6 bg-linear-to-b from-card to-transparent" />
          </div>

          <ScrollArea className="h-full w-full [&>div]:overflow-x-hidden!">
            <div className="p-3 pt-8 pb-12 space-y-4 min-w-0 w-full overflow-hidden">
              {isLoading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs">{t('editor.variablesPanel.loading')}</span>
                </div>
              )}

              {!isLoading &&
                groupedVariables.length === 0 &&
                ungroupedInternal.length === 0 &&
                ungroupedExternal.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <VariableIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t('editor.variablesPanel.empty.title')}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {searchQuery.trim()
                        ? t('editor.variablesPanel.empty.searchSuggestion')
                        : t('editor.variablesPanel.empty.addSuggestion')}
                    </p>
                  </div>
                )}

              {/* Ungrouped External */}
              {!isLoading && ungroupedExternal.length > 0 && (
                <div className="space-y-2 min-w-0">
                  <button
                    onClick={() => setExternalSectionOpen(!externalSectionOpen)}
                    className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-external w-full hover:text-external/80 transition-colors"
                  >
                    <motion.div
                      animate={{ rotate: externalSectionOpen ? 90 : 0 }}
                      transition={COLLAPSE_TRANSITION}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </motion.div>
                    <Database className="h-3 w-3" />
                    <span>{t('editor.variablesPanel.sections.externalVariables')}</span>
                    <span className="ml-auto text-[9px] bg-external-muted/50 text-external-foreground px-1.5 rounded">
                      {ungroupedExternal.length}
                    </span>
                  </button>

                  <motion.div
                    initial={false}
                    animate={{
                      height: externalSectionOpen ? 'auto' : 0,
                      opacity: externalSectionOpen ? 1 : 0,
                    }}
                    transition={COLLAPSE_TRANSITION}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="space-y-2 pt-2 min-w-0">
                      {ungroupedExternal.map((v) => (
                        <DraggableVariable
                          key={v.variableId}
                          data={mapVariableToDragData(v)}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Ungrouped Internal */}
              {!isLoading && ungroupedInternal.length > 0 && (
                <div className="space-y-2 min-w-0">
                  <button
                    onClick={() => setInternalSectionOpen(!internalSectionOpen)}
                    className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-internal w-full hover:text-internal/80 transition-colors"
                  >
                    <motion.div
                      animate={{ rotate: internalSectionOpen ? 90 : 0 }}
                      transition={COLLAPSE_TRANSITION}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </motion.div>
                    <Clock className="h-3 w-3" />
                    <span>{t('editor.variablesPanel.sections.internalVariables')}</span>
                    <span className="ml-auto text-[9px] bg-internal-muted/50 text-internal-foreground px-1.5 rounded">
                      {ungroupedInternal.length}
                    </span>
                  </button>

                  <motion.div
                    initial={false}
                    animate={{
                      height: internalSectionOpen ? 'auto' : 0,
                      opacity: internalSectionOpen ? 1 : 0,
                    }}
                    transition={COLLAPSE_TRANSITION}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="space-y-2 pt-2 min-w-0">
                      {ungroupedInternal.map((v) => (
                        <DraggableVariable
                          key={v.variableId}
                          data={mapVariableToDragData(v)}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Grouped Variables */}
              {!isLoading && groupedVariables.map(([groupKey, variables]) => {
                const group = groups.find(g => g.key === groupKey)
                if (!group) return null

                return (
                  <VariableGroup
                    key={groupKey}
                    group={group}
                    variables={variables}
                    isOpen={groupOpenStates[groupKey] ?? false}
                    onOpenChange={(open) => handleGroupOpenChange(groupKey, open)}
                  />
                )
              })}
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10 flex flex-col">
            <div className="h-6 bg-linear-to-t from-card to-transparent" />
            <div className="h-4 bg-card" />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
