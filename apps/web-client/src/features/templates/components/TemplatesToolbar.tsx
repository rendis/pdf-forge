import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ChevronDown, List, Grid, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TagWithCount } from '../api/tags-api'

interface TemplatesToolbarProps {
  viewMode: 'list' | 'grid'
  onViewModeChange: (mode: 'list' | 'grid') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: boolean | undefined
  onStatusFilterChange: (value: boolean | undefined) => void
  tags: TagWithCount[]
  selectedTagIds: string[]
  onTagsChange: (ids: string[]) => void
}

type StatusOption = {
  label: string
  value: boolean | undefined
}

export function TemplatesToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tags,
  selectedTagIds,
  onTagsChange,
}: TemplatesToolbarProps) {
  const { t } = useTranslation()
  const [statusOpen, setStatusOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const tagsRef = useRef<HTMLDivElement>(null)

  const statusOptions: StatusOption[] = [
    { label: t('templates.status.any', 'Any'), value: undefined },
    { label: t('templates.status.published', 'Published'), value: true },
    { label: t('templates.status.draft', 'Draft'), value: false },
  ]

  const currentStatusLabel =
    statusOptions.find((opt) => opt.value === statusFilter)?.label ??
    t('templates.status.any', 'Any')

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusRef.current &&
        !statusRef.current.contains(event.target as Node)
      ) {
        setStatusOpen(false)
      }
      if (tagsRef.current && !tagsRef.current.contains(event.target as Node)) {
        setTagsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTagToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onTagsChange([...selectedTagIds, tagId])
    }
  }

  const clearTags = () => {
    onTagsChange([])
    setTagsOpen(false)
  }

  return (
    <div className="flex shrink-0 flex-col justify-between gap-6 border-b border-border bg-background px-4 py-6 md:flex-row md:items-center md:px-6 lg:px-6">
      {/* Search */}
      <div className="group relative w-full md:max-w-md">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
          size={20}
        />
        <input
          type="text"
          placeholder={t(
            'templates.searchPlaceholder',
            'Search templates by name...'
          )}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-8 pr-4 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6">
        {/* Status Filter */}
        <div ref={statusRef} className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>
              {t('templates.status.label', 'Status')}: {currentStatusLabel}
            </span>
            <ChevronDown
              size={16}
              className={cn(
                'transition-transform',
                statusOpen && 'rotate-180'
              )}
            />
          </button>
          {statusOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 min-w-[160px] border border-border bg-background shadow-lg">
              {statusOptions.map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => {
                    onStatusFilterChange(option.value)
                    setStatusOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2 text-left font-mono text-sm uppercase tracking-wider transition-colors hover:bg-muted',
                    statusFilter === option.value && 'text-foreground',
                    statusFilter !== option.value && 'text-muted-foreground'
                  )}
                >
                  <span>{option.label}</span>
                  {statusFilter === option.value && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags Filter */}
        <div ref={tagsRef} className="relative">
          <button
            onClick={() => setTagsOpen(!tagsOpen)}
            className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>
              {t('templates.tags', 'Tags')}
              {selectedTagIds.length > 0 && ` (${selectedTagIds.length})`}
            </span>
            <ChevronDown
              size={16}
              className={cn('transition-transform', tagsOpen && 'rotate-180')}
            />
          </button>
          {tagsOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 max-h-[300px] min-w-[220px] overflow-y-auto border border-border bg-background shadow-lg">
              {tags.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  {t('templates.noTags', 'No tags available')}
                </div>
              ) : (
                <>
                  {selectedTagIds.length > 0 && (
                    <button
                      onClick={clearTags}
                      className="flex w-full items-center gap-2 border-b border-border px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X size={14} />
                      <span>{t('common.clear', 'Clear all')}</span>
                    </button>
                  )}
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-muted',
                        selectedTagIds.includes(tag.id)
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {tag.templateCount}
                        </span>
                        {selectedTagIds.includes(tag.id) && <Check size={14} />}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="ml-2 flex items-center gap-2 border-l border-border pl-6">
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'transition-colors',
              viewMode === 'list'
                ? 'text-foreground'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            )}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'transition-colors',
              viewMode === 'grid'
                ? 'text-foreground'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            )}
          >
            <Grid size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
