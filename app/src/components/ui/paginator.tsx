import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PaginatorProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

export function Paginator({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}: PaginatorProps): React.ReactElement | null {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || isFirstPage}
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground/50 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft size={14} />
        <span>{t('pagination.prev', 'Previous')}</span>
      </button>

      <span className="font-mono text-xs text-muted-foreground/50">
        {t('pagination.page', 'Page')} {page} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || isLastPage}
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground/50 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <span>{t('pagination.next', 'Next')}</span>
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
