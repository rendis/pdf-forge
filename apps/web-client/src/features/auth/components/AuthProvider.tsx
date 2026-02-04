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
  const {
    token,
    refreshToken,
    isAuthLoading,
    setAuthLoading,
    setTokens,
    setUserProfile,
    setAllRoles,
    clearAuth,
    isTokenExpired,
  } = useAuthStore()

  // Ref to prevent StrictMode double-initialization
  const initRef = useRef<{ started: boolean; promise: Promise<void> | null }>({
    started: false,
    promise: null,
  })

  useEffect(() => {
    // Initialize theme system
    const cleanupTheme = initializeTheme()

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
        // Fetch auth config from backend (runtime, not build-time)
        const config = await getAuthConfig()

        // Initialize OIDC config for all subsequent operations
        const oidcConfig = getOIDCConfig(config)
        initOIDCConfig(oidcConfig)

        if (config.dummyAuth) {
          console.log('[Auth] Dummy auth mode — auto-login as admin')
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
          setAuthLoading(false)
          return
        }

        // Standard OIDC flow: check existing tokens
        if (token && refreshToken) {
          // If token is expired, try to refresh
          if (isTokenExpired()) {
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
            // Don't clear auth here - user is still authenticated
            // Roles will be empty but user can still navigate
          }
        }
      } catch (error) {
        console.error('[Auth] Initialization failed:', error)
        clearAuth()
      } finally {
        setAuthLoading(false)
      }
    }

    initRef.current.promise = init()

    // Setup automatic token refresh
    const cleanupRefresh = setupTokenRefresh()

    return () => {
      cleanupTheme?.()
      cleanupRefresh()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isAuthLoading) {
    return <LoadingOverlay message="Initializing..." />
  }

  return <>{children}</>
}
