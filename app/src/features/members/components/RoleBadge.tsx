import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const ROLE_STYLES: Record<string, string> = {
  // System
  SUPERADMIN: 'border-destructive/30 bg-destructive/10 text-destructive',
  PLATFORM_ADMIN: 'border-warning-border bg-warning-muted text-warning-foreground',
  // Tenant
  TENANT_OWNER: 'border-admin-border bg-admin-muted text-admin-foreground',
  TENANT_ADMIN: 'border-accent-blue-border bg-accent-blue-muted text-accent-blue-foreground',
  // Workspace
  OWNER: 'border-admin-border bg-admin-muted text-admin-foreground',
  ADMIN: 'border-accent-blue-border bg-accent-blue-muted text-accent-blue-foreground',
  EDITOR: 'border-success-border bg-success-muted text-success-foreground',
  OPERATOR: 'border-warning-border bg-warning-muted text-warning-foreground',
  VIEWER: 'border-border bg-muted text-muted-foreground',
}

interface RoleBadgeProps {
  role: string
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const { t } = useTranslation()
  const style = ROLE_STYLES[role] ?? 'border-border bg-muted text-muted-foreground'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest',
        style,
        className
      )}
    >
      {t(`members.roles.${role}`, role.replace(/_/g, ' '))}
    </span>
  )
}
