import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar-store'
import { SidebarToggleButton } from './SidebarToggleButton'
import { SidebarContent } from './SidebarContent'

export function AppSidebar() {
  const { isPinned, isHovering, closeMobile } = useSidebarStore()

  const isExpanded = isPinned || isHovering

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 256 : 64 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'relative flex h-full flex-col overflow-visible bg-sidebar-background pt-16'
      )}
    >
      {/* Toggle button - only visible on desktop */}
      <div className="hidden lg:block">
        <SidebarToggleButton />
      </div>

      {/* Línea derecha animada - de arriba hacia abajo */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-px bg-border origin-top"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />

      <SidebarContent
        isExpanded={isExpanded}
        onNavigate={closeMobile}
        showAnimations={true}
      />
    </motion.aside>
  )
}
