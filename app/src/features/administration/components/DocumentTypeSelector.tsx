import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocumentTypes } from '../hooks/useDocumentTypes'

interface DocumentTypeSelectorProps {
  currentTypeId?: string | null
  currentTypeName?: Record<string, string> | null
  onAssign: (documentTypeId: string | null) => Promise<void>
  disabled?: boolean
}

function getLocalizedName(name: Record<string, string>, locale: string): string {
  return name[locale] || name['es'] || name['en'] || Object.values(name)[0] || ''
}

export function DocumentTypeSelector({
  currentTypeId,
  currentTypeName,
  onAssign,
  disabled = false,
}: DocumentTypeSelectorProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [optimisticName, setOptimisticName] = useState<string | null>(null)

  const { data: documentTypesData } = useDocumentTypes(1, 100)
  const documentTypes = documentTypesData?.data ?? []

  const resolvedTypeName = currentTypeName
    ?? documentTypes.find((dt) => dt.id === currentTypeId)?.name
    ?? null

  const displayName = resolvedTypeName
    ? getLocalizedName(resolvedTypeName, i18n.language)
    : null

  // Clear optimistic state once server data catches up
  useEffect(() => {
    setOptimisticName(null)
  }, [currentTypeId])

  const shownName = optimisticName !== null ? optimisticName : displayName

  const handleSelect = async (documentTypeId: string | null) => {
    if (documentTypeId === currentTypeId) {
      setIsOpen(false)
      return
    }

    // Optimistically show the new selection
    if (documentTypeId === null) {
      setOptimisticName('')
    } else {
      const selected = documentTypes.find((dt) => dt.id === documentTypeId)
      setOptimisticName(selected ? getLocalizedName(selected.name, i18n.language) : null)
    }

    setIsLoading(true)
    try {
      await onAssign(documentTypeId)
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || isLoading}>
        <button
          className={cn(
            'inline-flex min-h-[24px] items-center gap-2 text-sm transition-colors',
            'hover:text-foreground',
            shownName
              ? 'text-foreground'
              : 'text-muted-foreground italic',
            (disabled || isLoading) && 'cursor-not-allowed opacity-50'
          )}
        >
          <span>
            {shownName || t('templates.detail.noDocumentType', 'No type assigned')}
          </span>
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-w-[90vw]">
        {/* None option */}
        <DropdownMenuItem
          onClick={() => handleSelect(null)}
          className="flex items-center justify-between"
        >
          <span className="italic text-muted-foreground">
            {t('templates.detail.noDocumentType', 'No type assigned')}
          </span>
          {currentTypeId === null && <Check size={14} />}
        </DropdownMenuItem>

        {/* Separator */}
        {documentTypes.length > 0 && (
          <div className="my-1 border-t border-border" />
        )}

        {/* Document types */}
        {documentTypes.map((docType) => (
          <DropdownMenuItem
            key={docType.id}
            onClick={() => handleSelect(docType.id)}
            className="flex items-center justify-between"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="max-w-[140px] truncate">{getLocalizedName(docType.name, i18n.language)}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{getLocalizedName(docType.name, i18n.language)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="shrink-0 rounded-sm border px-1 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                {docType.code}
              </span>
            </div>
            {currentTypeId === docType.id && <Check size={14} />}
          </DropdownMenuItem>
        ))}

        {/* Empty state */}
        {documentTypes.length === 0 && (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            {t('templates.detail.noDocumentTypesAvailable', 'No document types available')}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
