import { useTranslation } from 'react-i18next'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/core'
import { useInconsistencyNavigation } from '../hooks/useInconsistencyNavigation'

interface InconsistencyNavigatorProps {
  editor: Editor | null
  className?: string
}

/**
 * Floating navigator component for invalid injectables.
 * Shows a counter and prev/next buttons to navigate between issues.
 * Only visible when there are inconsistencies.
 */
export function InconsistencyNavigator({
  editor,
  className,
}: InconsistencyNavigatorProps) {
  const { t } = useTranslation()
  const { count, currentIndex, next, prev, navigateTo } =
    useInconsistencyNavigation(editor)

  // Don't render if no inconsistencies
  if (count === 0) return null

  const isNavigating = currentIndex >= 0
  const displayText = isNavigating
    ? t('editor.inconsistencies.position', {
        current: currentIndex + 1,
        total: count,
      })
    : t('editor.inconsistencies.count', { count })

  const handleCounterClick = () => {
    if (!isNavigating) {
      navigateTo(0)
    }
  }

  return (
    <div
      className={cn(
        // Layout
        'flex items-center',
        // Background and colors
        'bg-destructive text-destructive-foreground',
        // Border
        'border-2 border-destructive-foreground/20',
        // Typography
        'font-mono text-xs uppercase tracking-widest',
        // Shadow
        'shadow-lg',
        // Angular style - no rounded corners
        'rounded-none',
        // Animation
        'animate-slide-in-bottom',
        className
      )}
    >
      {/* Counter section */}
      <button
        type="button"
        onClick={handleCounterClick}
        className={cn(
          'flex items-center gap-2',
          'px-4 py-2',
          'border-r border-destructive-foreground/30',
          'hover:bg-destructive-foreground/10',
          'transition-colors',
          'cursor-pointer'
        )}
        title={t('editor.inconsistencies.clickToNavigate')}
      >
        <AlertTriangle className="h-4 w-4" />
        <span>{displayText}</span>
      </button>

      {/* Navigation buttons */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={prev}
          className={cn(
            'p-2',
            'hover:bg-destructive-foreground/20',
            'transition-colors'
          )}
          title={t('editor.inconsistencies.previous')}
          aria-label={t('editor.inconsistencies.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={next}
          className={cn(
            'p-2',
            'hover:bg-destructive-foreground/20',
            'transition-colors'
          )}
          title={t('editor.inconsistencies.next')}
          aria-label={t('editor.inconsistencies.next')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
