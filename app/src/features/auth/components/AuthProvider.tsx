import { useEffect, useRef, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { refreshAccessToken, getUserInfo, setupTokenRefresh, initOIDCConfig } from '@/lib/oidc'
import { getAuthConfig, getOIDCConfig } from '@/lib/auth-config'
import { fetchMyRoles } from '@/features/auth/api/auth-api'
import { initializeTheme } from '@/stores/theme-store'
import { LoadingOverlay } from '@/components/common/LoadingSpinner'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Only subscribe to the one reactive value we need for rendering
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading)

  // Ref to prevent StrictMode double-initialization
  const initRef = useRef<{ started: boolean; promise: Promise<void> | null }>({
    started: false,
    promise: null,
  })

  // Ref to hold token refresh cleanup (set inside init, called in effect cleanup)
  const refreshCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Initialize theme system
    const cleanupTheme = initializeTheme()

    // Use getState() for all actions — stable references, no subscription
    const { setAuthLoading, setTokens, setUserProfile, setAllRoles, clearAuth } = useAuthStore.getState()

    // Skip if already started (prevents StrictMode double-call)
    if (initRef.current.started) {
      // Wait for existing promise if in-flight
      if (initRef.current.promise) {
        initRef.current.promise.finally(() => setAuthLoading(false))
      }
      return () => {
        cleanupTheme?.()
      }
    }
    initRef.current.started = true

    const init = async () => {
      try {
        const staleToken = useAuthStore.getState().token
        // Fetch auth config from backend (runtime, not build-time)
        const config = await getAuthConfig()

        // Initialize OIDC config for all subsequent operations
        const oidcConfig = getOIDCConfig(config)
        initOIDCConfig(oidcConfig)

        console.log(`[Auth] Init: staleToken=${!!staleToken}, mode=${config.dummyAuth ? 'dummyAuth' : 'oidc'}`)

        if (config.dummyAuth) {
          // Clear any stale OIDC tokens before setting fresh dummy tokens
          if (staleToken && staleToken !== 'dummy-token') {
            clearAuth(false)
          }

          setTokens('dummy-token', 'dummy-refresh', 86400)
          setUserProfile({
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@pdfforge.local',
            firstName: 'PDF Forge',
            lastName: 'Admin',
            username: 'admin',
          })
          const roles = await fetchMyRoles()
          setAllRoles(roles)
          // No token refresh needed in dummyAuth mode
          console.log('[Auth] Init complete: dummyAuth ok')
          return
        }

        // Standard OIDC flow: check existing tokens
        const { token, refreshToken } = useAuthStore.getState()
        if (token && refreshToken) {
          // If token is expired, try to refresh
          if (useAuthStore.getState().isTokenExpired()) {
            console.log('[Auth] Token expired, attempting refresh...')
            try {
              await refreshAccessToken()
              console.log('[Auth] Token refreshed successfully')
            } catch (error) {
              console.error('[Auth] Failed to refresh token:', error)
              clearAuth()
              setAuthLoading(false)
              return
            }
          }

          // Token is valid, load user info and roles
          try {
            const userInfo = await getUserInfo()
            setUserProfile({
              id: userInfo.sub,
              email: userInfo.email || '',
              firstName: userInfo.given_name,
              lastName: userInfo.family_name,
              username: userInfo.preferred_username,
            })

            const roles = await fetchMyRoles()
            setAllRoles(roles)

            console.log('[Auth] User info and roles loaded')
          } catch (error) {
            console.error('[Auth] Failed to load user info or roles:', error)
          }
        }

        // Setup token refresh only for OIDC mode (not dummyAuth)
        refreshCleanupRef.current = setupTokenRefresh()
        console.log('[Auth] Init complete: oidc ok')
      } catch (error) {
        console.error('[Auth] Init complete: error', error)
        useAuthStore.getState().clearAuth()
      } finally {
        useAuthStore.getState().setAuthLoading(false)
      }
    }

    initRef.current.promise = init()

    return () => {
      cleanupTheme?.()
      refreshCleanupRef.current?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isAuthLoading) {
    return <LoadingOverlay message="Initializing..." />
  }

  return <>{children}</>
}
