import { motion } from 'framer-motion'
import { Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSidebarStore } from '@/stores/sidebar-store'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface SidebarToggleButtonProps {
  className?: string
}

export function SidebarToggleButton({ className }: SidebarToggleButtonProps) {
  const { t } = useTranslation()
  const { isPinned, togglePinned } = useSidebarStore()

  const tooltipText = isPinned ? t('sidebar.unpin') : t('sidebar.pin')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={togglePinned}
          aria-label={tooltipText}
          className={cn(
            'absolute right-0 top-1/2 z-10 h-7 w-7 -translate-y-1/2 translate-x-1/2 rounded-full border bg-background shadow-sm transition-all hover:scale-105 hover:bg-accent',
            isPinned && 'border-admin/50 bg-background',
            className
          )}
        >
          <motion.div
            initial={false}
            animate={{ rotate: isPinned ? 45 : 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <Pin
              size={14}
              className={cn(
                'transition-colors duration-200',
                isPinned
                  ? 'fill-admin text-admin'
                  : 'text-muted-foreground'
              )}
            />
          </motion.div>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}
