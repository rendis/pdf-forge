import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CheckSquare,
  ChevronRight,
  Code2,
  Coins,
  Hash,
  Image as ImageIcon,
  Table,
  Type,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SystemInjectable } from '../types'

// Icon mapping based on data type (same as editor)
const DATA_TYPE_ICONS: Record<string, LucideIcon> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
  ROLE_TEXT: User,
}

function getIconForType(dataType: string): LucideIcon {
  return DATA_TYPE_ICONS[dataType.toUpperCase()] || Code2
}

interface InjectableCardProps {
  injectable: SystemInjectable
  onToggle: (key: string, isActive: boolean) => void
  onSelect: (injectable: SystemInjectable) => void
  canManage: boolean
  isToggling?: boolean
  // Selection mode props
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (selected: boolean) => void
}

export function InjectableCard({
  injectable,
  onToggle,
  onSelect,
  canManage,
  isToggling,
  selectable = false,
  selected = false,
  onSelectChange,
}: InjectableCardProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const Icon = getIconForType(injectable.dataType)

  // Get localized text from i18n objects
  const label =
    injectable.label[i18n.language] || injectable.label['en'] || injectable.key
  const description =
    injectable.description[i18n.language] || injectable.description['en'] || ''

  function handleRowClick(e: React.MouseEvent) {
    // Only trigger if not clicking on the switch, checkbox, or their labels
    const target = e.target as HTMLElement
    if (target.closest('[data-switch-area]') || target.closest('[data-checkbox-area]')) {
      return
    }

    // In select mode, toggle selection instead of opening details
    if (selectable) {
      onSelectChange?.(!selected)
      return
    }

    onSelect(injectable)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group flex cursor-pointer items-center justify-between border-b border-border px-3 py-2.5 transition-colors hover:bg-muted/30',
        selected && 'bg-muted/50'
      )}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (selectable) {
            onSelectChange?.(!selected)
          } else {
            onSelect(injectable)
          }
        }
      }}
    >
      <div className="flex flex-1 items-center gap-3 text-left">
        {/* Checkbox for selection mode */}
        {selectable && (
          <div
            data-checkbox-area
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectChange?.(checked === true)}
              className="h-4 w-4"
            />
          </div>
        )}

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted/50">
          <Icon size={16} className="text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {injectable.key}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {injectable.dataType}
            </Badge>
            {injectable.isPublic ? (
              <Badge
                variant="secondary"
                className="bg-success-muted font-mono text-[10px] uppercase text-success-foreground"
              >
                {t('systemInjectables.visibility.public', 'Public')}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-warning-muted font-mono text-[10px] uppercase text-warning-foreground"
              >
                {t('systemInjectables.visibility.scoped', 'Scoped')}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div data-switch-area className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {injectable.isActive ? 'Active' : 'Inactive'}
          </span>
          <Switch
            checked={injectable.isActive}
            onCheckedChange={(checked) => onToggle(injectable.key, checked)}
            disabled={!canManage || isToggling}
            aria-label={`Toggle ${injectable.key}`}
          />
        </div>
        <ChevronRight
          size={14}
          className="text-muted-foreground transition-transform group-hover:translate-x-1"
        />
      </div>
    </div>
  )
}
