import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'

const LG_BREAKPOINT = 1024

/**
 * Sidebar store state
 */
interface SidebarState {
  // State
  isCollapsed: boolean
  isMobileOpen: boolean
  isPinned: boolean
  isHovering: boolean

  // Actions
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleMobileOpen: () => void
  setMobileOpen: (open: boolean) => void
  closeMobile: () => void
  togglePinned: () => void
  setPinned: (pinned: boolean) => void
  setHovering: (hovering: boolean) => void
}

/**
 * Sidebar store with persistence
 */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // Initial state
      isCollapsed: false,
      isMobileOpen: false,
      isPinned: true,
      isHovering: false,

      // Actions
      toggleCollapsed: () => set({ isCollapsed: !get().isCollapsed }),

      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),

      toggleMobileOpen: () => set({ isMobileOpen: !get().isMobileOpen }),

      setMobileOpen: (open) => set({ isMobileOpen: open }),

      closeMobile: () => set({ isMobileOpen: false }),

      togglePinned: () => {
        const newPinned = !get().isPinned
        set({ isPinned: newPinned, isHovering: false })
      },

      setPinned: (pinned) => set({ isPinned: pinned, isHovering: false }),

      setHovering: (hovering) => set({ isHovering: hovering }),
    }),
    {
      name: 'doc-assembly-sidebar',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        isPinned: state.isPinned,
      }),
    }
  )
)

/**
 * Hook to sync mobile sidebar state on window resize
 * Closes mobile sidebar when crossing lg breakpoint to desktop
 */
export function useSidebarResizeSync() {
  const closeMobile = useSidebarStore((state) => state.closeMobile)
  const isMobileOpen = useSidebarStore((state) => state.isMobileOpen)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      // Close mobile sidebar when resizing to desktop
      if (window.innerWidth >= LG_BREAKPOINT && isMobileOpen) {
        closeMobile()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [closeMobile, isMobileOpen])
}
