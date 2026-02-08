import { createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { WorkspaceTransitionOverlay } from '@/components/layout/WorkspaceTransitionOverlay'

export const Route = createRootRoute({
  component: RootLayout,
})

const PUBLIC_ROUTES = ['/login']

function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading)

  // Calcular key que agrupa rutas del mismo layout
  // Para rutas /workspace/xxx/* usar solo /workspace/xxx
  // Para otras rutas usar el pathname completo
  const layoutKey = useMemo(() => {
    const match = location.pathname.match(/^\/workspace\/[^/]+/)
    return match ? match[0] : location.pathname
  }, [location.pathname])

  useEffect(() => {
    // Skip check while auth is loading
    if (isAuthLoading) return

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
      location.pathname.startsWith(route)
    )

    // If not authenticated and not on public route, redirect to login
    if (!isAuthenticated && !isPublicRoute) {
      console.log('[Auth Guard] Not authenticated, redirecting to login')
      navigate({ to: '/login', replace: true })
    }
  }, [isAuthenticated, isAuthLoading, location.pathname, navigate])

  return (
    <LayoutGroup>
      <div className="min-h-screen bg-background text-foreground">
        <AnimatePresence mode="wait" initial={false}>
          <div key={layoutKey}>
            <Outlet />
          </div>
        </AnimatePresence>

        {/* Overlay que persiste entre rutas para animaciones de transición */}
        <WorkspaceTransitionOverlay />
      </div>
    </LayoutGroup>
  )
}
