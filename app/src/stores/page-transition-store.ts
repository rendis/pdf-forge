import { create } from 'zustand'

type TransitionDirection = 'forward' | 'backward' | null

interface PageTransitionStore {
  isTransitioning: boolean
  direction: TransitionDirection
  startTransition: (direction: TransitionDirection) => void
  endTransition: () => void
}

export const usePageTransitionStore = create<PageTransitionStore>((set) => ({
  isTransitioning: false,
  direction: null,
  startTransition: (direction) => set({ isTransitioning: true, direction }),
  endTransition: () => set({ isTransitioning: false, direction: null }),
}))
