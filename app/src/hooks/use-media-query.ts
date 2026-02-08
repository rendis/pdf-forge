import { useState, useEffect } from 'react'

/**
 * Hook to detect if a media query matches
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Tailwind breakpoints
const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

/**
 * Convenience hook for mobile detection (< lg breakpoint)
 * @returns boolean - true if viewport is less than lg (1024px)
 */
export function useIsMobile(): boolean {
  return !useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)
}

/**
 * Convenience hook for tablet detection (>= md and < lg)
 */
export function useIsTablet(): boolean {
  const isAboveMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md})`)
  const isBelowLg = !useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)
  return isAboveMd && isBelowLg
}

/**
 * Convenience hook for desktop detection (>= lg)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)
}
