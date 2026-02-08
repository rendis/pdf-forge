import type { ReactNode } from 'react'
import { usePermission } from '../hooks/usePermission'
import { type Permission } from '../rbac/rules'

interface PermissionGuardProps {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Component to conditionally render children based on permissions
 */
export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission()

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  } else {
    hasAccess = true
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
