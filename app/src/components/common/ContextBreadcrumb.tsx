import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useAppContextStore } from '@/stores/app-context-store'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

interface ContextBreadcrumbProps {
  className?: string
}

export function ContextBreadcrumb({ className }: ContextBreadcrumbProps) {
  const navigate = useNavigate()
  const { currentTenant, currentWorkspace, setCurrentWorkspace, setCurrentTenant, singleTenant, singleWorkspace } = useAppContextStore()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin())

  // Don't render if no context
  if (!currentTenant) return null

  // SUPERADMIN can always switch context, even if auto-selected as single
  const tenantClickable = !singleTenant || isSuperAdmin
  const workspaceClickable = !singleWorkspace || isSuperAdmin

  const handleTenantClick = () => {
    // Clear both tenant and workspace to show organization selection
    setCurrentTenant(null)
    navigate({ to: '/select-tenant', search: { intent: 'switch' } })
  }

  const handleWorkspaceClick = () => {
    // Clear only workspace to show workspace selection for current tenant
    setCurrentWorkspace(null)
    navigate({ to: '/select-tenant', search: { intent: 'switch' } })
  }

  return (
    <motion.nav
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={cn('flex items-center gap-2', className)}
      aria-label="Context navigation"
    >
      {/* Separator from logo */}
      <span className="text-border">·</span>

      {/* Tenant */}
      {!tenantClickable ? (
        <span
          className="max-w-[120px] truncate font-mono text-xs text-muted-foreground md:max-w-[180px]"
          title={currentTenant.name}
        >
          {currentTenant.name}
        </span>
      ) : (
        <button
          onClick={handleTenantClick}
          className="max-w-[120px] truncate font-mono text-xs text-muted-foreground transition-colors hover:text-foreground md:max-w-[180px]"
          title={currentTenant.name}
        >
          {currentTenant.name}
        </button>
      )}

      {/* Workspace (if selected) */}
      {currentWorkspace && (
        <>
          <ChevronRight size={12} className="text-muted-foreground/50" />
          {!workspaceClickable ? (
            <span
              className="max-w-[120px] truncate font-mono text-xs text-muted-foreground md:max-w-[180px]"
              title={currentWorkspace.name}
            >
              {currentWorkspace.name}
            </span>
          ) : (
            <button
              onClick={handleWorkspaceClick}
              className="max-w-[120px] truncate font-mono text-xs text-muted-foreground transition-colors hover:text-foreground md:max-w-[180px]"
              title={currentWorkspace.name}
            >
              {currentWorkspace.name}
            </button>
          )}
        </>
      )}
    </motion.nav>
  )
}
