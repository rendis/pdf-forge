import { motion, AnimatePresence } from 'framer-motion'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface DocumentPreparationOverlayProps {
  isVisible: boolean
  documentName?: string
}

export function DocumentPreparationOverlay({
  isVisible,
  documentName,
}: DocumentPreparationOverlayProps) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        >
          {/* All content fades in together */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col items-center gap-6"
          >
            {/* Document icon with subtle pulse */}
            <div className="relative">
              {/* Subtle pulsing ring */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.12, 0.04, 0.12],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-2xl bg-muted-foreground"
                style={{ margin: '-16px' }}
              />

              {/* Icon container */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-secondary border border-border shadow-sm">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>

            {/* Text content - fixed height container to prevent layout shift */}
            <div className="flex flex-col items-center gap-2 text-center min-h-[52px]">
              <h2 className="text-base font-medium text-foreground">
                {t('editor.preparation.title', 'Preparando documento')}
              </h2>

              {documentName && (
                <p className="text-sm text-muted-foreground max-w-[280px] truncate">
                  {documentName}
                </p>
              )}
            </div>

            {/* Loading indicator - subtle animated bar */}
            <div className="h-0.5 w-32 overflow-hidden rounded-full bg-border">
              <motion.div
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="h-full w-1/2 rounded-full bg-muted-foreground/50"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
