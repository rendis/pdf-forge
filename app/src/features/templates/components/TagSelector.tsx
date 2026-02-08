import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Check, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTags, useCreateTag } from '../hooks/useTags'
import { CreateTagInline } from './CreateTagInline'

interface TagSelectorProps {
  selectedTagIds: string[]
  onSelectionChange: (tagIds: string[]) => void
}

export function TagSelector({
  selectedTagIds,
  onSelectionChange,
}: TagSelectorProps) {
  const { t } = useTranslation()
  const { data: tagsData, isLoading } = useTags()
  const createTag = useCreateTag()

  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Memoize tags to avoid creating new array reference on each render
  const tags = useMemo(() => tagsData?.data ?? [], [tagsData?.data])

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags
    const query = searchQuery.toLowerCase().trim()
    return tags.filter((tag) => tag.name.toLowerCase().includes(query))
  }, [tags, searchQuery])

  // Check if search query matches any existing tag exactly
  const exactMatch = useMemo(() => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase().trim()
    return tags.some((tag) => tag.name.toLowerCase() === query)
  }, [tags, searchQuery])

  // Get selected tags for display
  const selectedTags = useMemo(() => {
    return tags.filter((tag) => selectedTagIds.includes(tag.id))
  }, [tags, selectedTagIds])

  const handleTagToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onSelectionChange([...selectedTagIds, tagId])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    onSelectionChange(selectedTagIds.filter((id) => id !== tagId))
  }

  const handleCreateTag = async (name: string, color: string) => {
    try {
      const newTag = await createTag.mutateAsync({ name, color })
      // Auto-select the newly created tag
      onSelectionChange([...selectedTagIds, newTag.id])
      setShowCreateForm(false)
      setSearchQuery('')
    } catch {
      // Error handled by mutation
    }
  }

  const handleShowCreateForm = () => {
    setShowCreateForm(true)
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="group relative">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
          size={16}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('tags.searchPlaceholder', 'Search or create tags...')}
          className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-6 pr-4 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
        />
      </div>

      {/* Tags list */}
      <div className="border border-border bg-background">
        <div className="max-h-[160px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </div>
          ) : filteredTags.length === 0 && !searchQuery.trim() ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {t('tags.noTags', 'No tags available')}
            </div>
          ) : (
            <>
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
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
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {tag.templateCount}
                    </span>
                    {selectedTagIds.includes(tag.id) && (
                      <Check size={14} className="text-foreground" />
                    )}
                  </div>
                </button>
              ))}

              {/* Show "Create tag" option when search doesn't match exactly */}
              {searchQuery.trim() && !exactMatch && !showCreateForm && (
                <button
                  type="button"
                  onClick={handleShowCreateForm}
                  className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus size={14} />
                  <span>
                    {t('tags.createNew', 'Create "{{name}}"', {
                      name: searchQuery.trim(),
                    })}
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Inline create form - outside the scrollable area */}
        {showCreateForm && (
          <CreateTagInline
            defaultName={searchQuery.trim()}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={handleCreateTag}
            isLoading={createTag.isPending}
          />
        )}
      </div>

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 border border-border bg-muted/50 px-2 py-1 text-sm"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-foreground">{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
