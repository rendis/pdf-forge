import { useCallback, useEffect, useRef, useState } from 'react'

interface UseOverflowScrollOptions {
  scrollAmount?: number
}

interface UseOverflowScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  scrollRef: React.RefObject<HTMLDivElement | null>
  canScrollLeft: boolean
  canScrollRight: boolean
  isOverflowing: boolean
  scrollLeft: () => void
  scrollRight: () => void
}

export function useOverflowScroll(
  options: UseOverflowScrollOptions = {}
): UseOverflowScrollReturn {
  const { scrollAmount = 150 } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [isOverflowing, setIsOverflowing] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkOverflow = useCallback(() => {
    const container = containerRef.current
    const scrollArea = scrollRef.current
    if (!container || !scrollArea) return

    const isOverflow = scrollArea.scrollWidth > container.clientWidth
    setIsOverflowing(isOverflow)

    setCanScrollLeft(scrollArea.scrollLeft > 1)
    setCanScrollRight(
      scrollArea.scrollLeft < scrollArea.scrollWidth - scrollArea.clientWidth - 1
    )
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const scrollArea = scrollRef.current
    if (!container || !scrollArea) return

    // Initial check
    checkOverflow()

    // ResizeObserver for container and content size changes
    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(container)
    resizeObserver.observe(scrollArea)

    // Scroll event listener
    scrollArea.addEventListener('scroll', checkOverflow, { passive: true })

    return () => {
      resizeObserver.disconnect()
      scrollArea.removeEventListener('scroll', checkOverflow)
    }
  }, [checkOverflow])

  const scrollLeftFn = useCallback(() => {
    if (!scrollRef.current) return
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    scrollRef.current.scrollBy({
      left: -scrollAmount,
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    })
  }, [scrollAmount])

  const scrollRightFn = useCallback(() => {
    if (!scrollRef.current) return
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    scrollRef.current.scrollBy({
      left: scrollAmount,
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    })
  }, [scrollAmount])

  return {
    containerRef,
    scrollRef,
    canScrollLeft,
    canScrollRight,
    isOverflowing,
    scrollLeft: scrollLeftFn,
    scrollRight: scrollRightFn,
  }
}
