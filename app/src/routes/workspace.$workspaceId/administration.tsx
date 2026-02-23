import { AdministrationPage } from '@/features/administration'
import {
  Permission,
  SYSTEM_RULES,
  TENANT_RULES,
  type SystemRole,
  type TenantRole,
} from '@/features/auth/rbac/rules'
import { useAppContextStore } from '@/stores/app-context-store'
import { useAuthStore } from '@/stores/auth-store'
import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Check ADMIN_ACCESS permission without React hooks (for route beforeLoad).
 * Mirrors usePermission logic but uses getState() instead of hooks.
 */
function hasAdminAccess(): boolean {
  const { systemRoles } = useAuthStore.getState()
  const { currentTenant, isSystemContext } = useAppContextStore.getState()

  // System context always grants access (original behavior)
  if (isSystemContext()) return true

  // Check system roles
  for (const role of systemRoles) {
    if (SYSTEM_RULES[role as SystemRole]?.includes(Permission.ADMIN_ACCESS)) return true
  }

  // Check tenant role
  const tenantRole = currentTenant?.role as TenantRole | undefined
  if (tenantRole && TENANT_RULES[tenantRole]?.includes(Permission.ADMIN_ACCESS)) return true

  return false
}

export const Route = createFileRoute('/workspace/$workspaceId/administration')({
  beforeLoad: () => {
    if (!hasAdminAccess()) {
      throw redirect({ to: '/workspace/$workspaceId' })
    }
  },
  component: AdministrationPage,
})
