import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from '@/components/ui/use-toast'

/**
 * System roles - platform level
 */
export type SystemRole = 'SUPERADMIN' | 'PLATFORM_ADMIN'

/**
 * Tenant roles
 */
export type TenantRole = 'TENANT_OWNER' | 'TENANT_ADMIN'

/**
 * Workspace roles
 */
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'OPERATOR' | 'VIEWER'

/**
 * All possible roles
 */
export type UserRole = SystemRole | TenantRole | WorkspaceRole

/**
 * Role entry from API
 */
export interface RoleEntry {
  type: 'SYSTEM' | 'TENANT' | 'WORKSPACE'
  role: string
  resourceId: string | null
}

/**
 * User profile
 */
export interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
}

/**
 * Auth store state
 */
interface AuthState {
  // State
  token: string | null
  refreshToken: string | null
  tokenExpiresAt: number | null
  isAuthLoading: boolean
  systemRoles: SystemRole[]
  userProfile: UserProfile | null
  allRoles: RoleEntry[]
  // Deduplication flags - prevent redundant API calls
  userInfoLoaded: boolean
  rolesLoaded: boolean

  // Actions
  setToken: (token: string | null) => void
  setRefreshToken: (token: string | null) => void
  setTokenExpiry: (expiresAt: number | null) => void
  setAuthLoading: (loading: boolean) => void
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void
  setSystemRoles: (roles: SystemRole[]) => void
  setUserProfile: (profile: UserProfile | null) => void
  setAllRoles: (roles: RoleEntry[]) => void
  clearAuth: () => void

  // Computed
  isAuthenticated: () => boolean
  isTokenExpired: () => boolean
  hasValidRefreshToken: () => boolean
  isSuperAdmin: () => boolean
  isPlatformAdmin: () => boolean
  canAccessAdmin: () => boolean
  getSystemRole: () => SystemRole | null
}

/**
 * Auth store with persistence
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthLoading: true,
      systemRoles: [],
      userProfile: null,
      allRoles: [],
      userInfoLoaded: false,
      rolesLoaded: false,

      // Actions
      setToken: (token) => set({ token }),

      setRefreshToken: (refreshToken) => set({ refreshToken }),

      setTokenExpiry: (tokenExpiresAt) => set({ tokenExpiresAt }),

      setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

      setTokens: (accessToken, refreshToken, expiresIn) => {
        const tokenExpiresAt = Date.now() + expiresIn * 1000
        set({
          token: accessToken,
          refreshToken,
          tokenExpiresAt,
        })
      },

      setSystemRoles: (roles) => set({ systemRoles: roles }),

      setUserProfile: (profile) => set({ userProfile: profile, userInfoLoaded: profile !== null }),

      setAllRoles: (roles) => {
        // Extract system roles from all roles
        const systemRoles = roles
          .filter((r) => r.type === 'SYSTEM')
          .map((r) => r.role as SystemRole)

        set({ allRoles: roles, systemRoles, rolesLoaded: true })
      },

      clearAuth: () => {
        // Show notification if user was previously authenticated
        const wasAuthenticated = get().token !== null

        set({
          token: null,
          refreshToken: null,
          tokenExpiresAt: null,
          systemRoles: [],
          userProfile: null,
          allRoles: [],
          userInfoLoaded: false,
          rolesLoaded: false,
        })

        // Show toast only if session expired (not on initial load)
        if (wasAuthenticated) {
          toast({
            variant: 'destructive',
            title: 'Session Expired',
            description: 'Your session has expired. Please login again.',
          })
        }
      },

      // Computed
      isAuthenticated: () => {
        const { token } = get()
        return token !== null
      },

      isTokenExpired: () => {
        const { tokenExpiresAt } = get()
        if (!tokenExpiresAt) return true
        // Consider token expired 30 seconds before actual expiry
        return Date.now() > tokenExpiresAt - 30000
      },

      hasValidRefreshToken: () => {
        const { refreshToken } = get()
        return refreshToken !== null
      },

      isSuperAdmin: () => {
        const { systemRoles } = get()
        return systemRoles.includes('SUPERADMIN')
      },

      isPlatformAdmin: () => {
        const { systemRoles } = get()
        return systemRoles.includes('PLATFORM_ADMIN')
      },

      canAccessAdmin: () => {
        const { systemRoles } = get()
        return (
          systemRoles.includes('SUPERADMIN') ||
          systemRoles.includes('PLATFORM_ADMIN')
        )
      },

      getSystemRole: () => {
        const { systemRoles } = get()
        if (systemRoles.includes('SUPERADMIN')) return 'SUPERADMIN'
        if (systemRoles.includes('PLATFORM_ADMIN')) return 'PLATFORM_ADMIN'
        return null
      },
    }),
    {
      name: 'doc-assembly-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
        systemRoles: state.systemRoles,
        userProfile: state.userProfile,
      }),
    }
  )
)

/**
 * Get tenant role for a specific tenant
 */
export function getTenantRole(tenantId: string): TenantRole | null {
  const { allRoles } = useAuthStore.getState()
  const role = allRoles.find(
    (r) => r.type === 'TENANT' && r.resourceId === tenantId
  )
  return role ? (role.role as TenantRole) : null
}

/**
 * Get workspace role for a specific workspace
 */
export function getWorkspaceRole(workspaceId: string): WorkspaceRole | null {
  const { allRoles } = useAuthStore.getState()
  const role = allRoles.find(
    (r) => r.type === 'WORKSPACE' && r.resourceId === workspaceId
  )
  return role ? (role.role as WorkspaceRole) : null
}
