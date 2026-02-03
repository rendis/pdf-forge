import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePermission } from '@/features/auth/hooks/usePermission'
import { Permission } from '@/features/auth/rbac/rules'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { MoreHorizontal, Pencil, Power, PowerOff, Trash, Variable } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
    useActivateWorkspaceInjectable,
    useDeactivateWorkspaceInjectable,
} from '../hooks/useWorkspaceInjectables'
import type { WorkspaceInjectable } from '../types'

interface InjectableRowProps {
  injectable: WorkspaceInjectable
  index?: number
  onEdit: () => void
  onDelete: () => void
}

const MAX_ANIMATED_ROWS = 10
const STAGGER_DELAY = 0.05

export function InjectableRow({
  injectable,
  index = 0,
  onEdit,
  onDelete,
}: InjectableRowProps): React.ReactElement {
  const { t } = useTranslation()
  const { hasPermission } = usePermission()

  const canEdit = hasPermission(Permission.INJECTABLE_EDIT)
  const canDelete = hasPermission(Permission.INJECTABLE_DELETE)
  const canToggleStatus = hasPermission(Permission.INJECTABLE_TOGGLE_STATUS)

  const activateMutation = useActivateWorkspaceInjectable()
  const deactivateMutation = useDeactivateWorkspaceInjectable()

  async function handleToggleStatus(): Promise<void> {
    if (injectable.isActive) {
      await deactivateMutation.mutateAsync(injectable.id)
    } else {
      await activateMutation.mutateAsync(injectable.id)
    }
  }

  const isToggling = activateMutation.isPending || deactivateMutation.isPending
  const shouldAnimate = index < MAX_ANIMATED_ROWS
  const staggerDelay = shouldAnimate ? index * STAGGER_DELAY : 0

  return (
    <motion.tr
      initial={shouldAnimate ? { opacity: 0, x: 20 } : undefined}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        ease: 'easeOut',
        delay: staggerDelay,
      }}
      className="group transition-colors hover:bg-accent"
    >
      <td className="border-b border-border py-5 pl-4 pr-4 align-middle">
        <div className="flex items-center gap-3">
          <Variable
            className="text-role transition-colors shrink-0"
            size={18}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[140px] truncate font-mono text-sm text-foreground">
                {injectable.key}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="font-mono text-sm">{injectable.key}</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </td>
      <td className="border-b border-border py-5 align-middle">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block max-w-[180px] truncate text-sm text-foreground">
              {injectable.label}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{injectable.label}</TooltipContent>
        </Tooltip>
      </td>
      <td className="border-b border-border py-5 align-middle">
        {injectable.description ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[140px] truncate text-sm text-muted-foreground">
                {injectable.description}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {injectable.description}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </td>
      <td className="border-b border-border py-5 align-middle">
        {injectable.defaultValue ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[100px] truncate font-mono text-sm text-foreground">
                {injectable.defaultValue}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <span className="font-mono text-sm">{injectable.defaultValue}</span>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="font-mono text-sm text-muted-foreground">-</span>
        )}
      </td>
      <td className="border-b border-border py-5 align-middle">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider',
            injectable.isActive ? 'text-green-600' : 'text-muted-foreground'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              injectable.isActive ? 'bg-green-500' : 'bg-muted-foreground'
            )}
          />
          {injectable.isActive
            ? t('variables.active', 'Active')
            : t('variables.inactive', 'Inactive')}
        </span>
      </td>
      <td className="border-b border-border py-4 pr-4 align-middle">
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <MoreHorizontal size={20} />
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('common.edit', 'Edit')}
              </DropdownMenuItem>
            )}
            {canToggleStatus && (
              <DropdownMenuItem onClick={handleToggleStatus} disabled={isToggling}>
                {injectable.isActive ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    {t('variables.deactivate', 'Deactivate')}
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    {t('variables.activate', 'Activate')}
                  </>
                )}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {t('common.delete', 'Delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  )
}
