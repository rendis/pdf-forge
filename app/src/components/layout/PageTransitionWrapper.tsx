import { motion } from 'framer-motion'
import { useLocation } from '@tanstack/react-router'
import { ReactNode } from 'react'

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IN = [0.7, 0, 0.84, 0] as const

const getPageType = (pathname: string): 'dashboard' | 'standard' => {
  if (pathname.match(/^\/workspace\/[^/]+\/?$/)) {
    return 'dashboard'
  }
  return 'standard'
}

// Solo fade - sin movimiento x/y
const standardVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.25, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: EASE_IN },
  },
}

// Dashboard: fade + scale sutil
const dashboardVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15, ease: EASE_IN },
  },
}

interface PageTransitionWrapperProps {
  children: ReactNode
}

export function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const location = useLocation()
  const pageType = getPageType(location.pathname)
  const variants = pageType === 'dashboard' ? dashboardVariants : standardVariants

  return (
    <motion.div
      className="flex h-full flex-1 flex-col"
      style={{ opacity: 0 }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
    >
      {children}
    </motion.div>
  )
}
