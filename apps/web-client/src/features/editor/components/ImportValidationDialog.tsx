/**
 * Import Validation Dialog
 *
 * Displays validation errors and warnings from document import.
 * Allows user to review issues before proceeding with import.
 */

import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ValidationResult } from '../types/document-format'

interface ImportValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  validation: ValidationResult
  onConfirm: () => void
}

export function ImportValidationDialog({
  open,
  onOpenChange,
  validation,
  onConfirm,
}: ImportValidationDialogProps) {
  const { t: _t } = useTranslation()

  const hasErrors = validation.errors.length > 0
  const hasWarnings = validation.warnings.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                Errores de Validación
              </>
            ) : hasWarnings ? (
              <>
                <AlertTriangle className="h-5 w-5 text-warning" />
                Advertencias de Importación
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                Validación Exitosa
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasErrors
              ? 'El documento tiene errores críticos que deben corregirse antes de importar.'
              : hasWarnings
                ? 'El documento tiene advertencias no críticas. Puedes importarlo de todas formas.'
                : 'El documento es válido y está listo para importar.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Errors Section */}
            {hasErrors && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errores ({validation.errors.length})
                </h4>
                <div className="space-y-2">
                  {validation.errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-destructive/10 border border-destructive/20 rounded-md"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-destructive">
                            {error.message}
                          </p>
                          {error.path && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              Ubicación: {error.path}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Código: {error.code}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings Section */}
            {hasWarnings && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Advertencias ({validation.warnings.length})
                </h4>
                <div className="space-y-2">
                  {validation.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            {warning.message}
                          </p>
                          {warning.path && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              Ubicación: {warning.path}
                            </p>
                          )}
                          {warning.suggestion && (
                            <p className="text-xs text-muted-foreground mt-1">
                              💡 {warning.suggestion}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Código: {warning.code}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Message */}
            {!hasErrors && !hasWarnings && (
              <div className="p-4 bg-success-muted border border-success-border rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <p className="text-sm text-success-foreground">
                    El documento pasó todas las validaciones correctamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {hasErrors ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!hasErrors && (
            <Button onClick={onConfirm}>
              {hasWarnings ? 'Importar de todas formas' : 'Importar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
