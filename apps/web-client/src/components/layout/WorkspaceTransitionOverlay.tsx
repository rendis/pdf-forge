import { motion } from 'framer-motion'
import { useWorkspaceTransitionStore } from '@/stores/workspace-transition-store'

export function WorkspaceTransitionOverlay() {
  const { selectedWorkspace, startPosition, phase, reset } = useWorkspaceTransitionStore()

  if (!selectedWorkspace || !startPosition || phase === 'idle' || phase === 'complete') {
    return null
  }

  // Calcular posición central
  const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 - startPosition.width / 2 : 0
  const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 - 40 : 0

  // El card se mantiene en el centro durante todas las fases después de toCenter
  const isAtCenter = phase === 'toCenter' || phase === 'fadeBorders' || phase === 'fadeOut'

  return (
    <motion.div
      className="pointer-events-none fixed z-[100] bg-background"
      initial={{
        left: startPosition.x,
        top: startPosition.y,
        width: startPosition.width,
        scale: 1,
        opacity: 1,
      }}
      animate={{
        left: isAtCenter ? centerX : startPosition.x,
        top: isAtCenter ? centerY : startPosition.y,
        width: startPosition.width,
        scale: phase === 'fadeOut' ? 0.9 : isAtCenter ? 1.1 : 1,
        opacity: phase === 'fadeOut' ? 0 : 1,
      }}
      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      onAnimationComplete={() => {
        if (phase === 'fadeOut') {
          reset()
        }
      }}
    >
      {/* Top border - shrinks from ends to center */}
      <motion.div
        className="absolute left-0 right-0 top-0 h-px bg-border"
        style={{ transformOrigin: 'center' }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: phase === 'fadeBorders' || phase === 'fadeOut' ? 0 : 1 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      />
      {/* Bottom border - shrinks from ends to center */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-border"
        style={{ transformOrigin: 'center' }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: phase === 'fadeBorders' || phase === 'fadeOut' ? 0 : 1 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      />

      {/* Content - el h3 se mueve de izquierda a centro */}
      <div className="relative py-6" style={{ height: 'auto' }}>
        <motion.h3
          className="font-display text-xl font-medium text-foreground md:text-2xl whitespace-nowrap absolute"
          style={{ top: '1.5rem' }}
          initial={{ left: '1rem' }}
          animate={{
            left: isAtCenter ? '50%' : '1rem',
            x: isAtCenter ? '-50%' : '0%',
          }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
        >
          {selectedWorkspace.name}
        </motion.h3>
        {/* Spacer para mantener altura */}
        <div className="invisible font-display text-xl font-medium md:text-2xl px-4">
          {selectedWorkspace.name}
        </div>
      </div>
    </motion.div>
  )
}
