import { useAuthStore } from '@/stores/auth-store'
import { useAppContextStore } from '@/stores/app-context-store'
import {
  Permission,
  WORKSPACE_RULES,
  TENANT_RULES,
  SYSTEM_RULES,
  type WorkspaceRole,
  type TenantRole,
  type SystemRole,
} from '../rbac/rules'

/**
 * Hook to check if user has a specific permission
 */
export function usePermission() {
  const { systemRoles } = useAuthStore()
  const { currentTenant, currentWorkspace } = useAppContextStore()

  const hasPermission = (permission: Permission): boolean => {
    // Check system roles first (highest priority)
    for (const role of systemRoles) {
      const systemPerms = SYSTEM_RULES[role as SystemRole]
      if (systemPerms?.includes(permission)) {
        return true
      }
    }

    // Check tenant role
    if (currentTenant?.role) {
      const tenantPerms = TENANT_RULES[currentTenant.role as TenantRole]
      if (tenantPerms?.includes(permission)) {
        return true
      }
    }

    // Check workspace role
    if (currentWorkspace?.role) {
      const workspacePerms = WORKSPACE_RULES[currentWorkspace.role as WorkspaceRole]
      if (workspacePerms?.includes(permission)) {
        return true
      }
    }

    return false
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((p) => hasPermission(p))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((p) => hasPermission(p))
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    Permission,
  }
}

/**
 * Hook to check if user can access admin console
 */
export function useCanAccessAdmin(): boolean {
  const { canAccessAdmin } = useAuthStore()
  return canAccessAdmin()
}
