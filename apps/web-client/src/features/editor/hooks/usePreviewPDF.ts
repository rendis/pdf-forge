import { useState, useCallback } from 'react'
import { previewApi } from '../api/preview-api'
import axios from 'axios'

interface UsePreviewPDFOptions {
  templateId: string
  versionId: string
}

interface UsePreviewPDFReturn {
  isGenerating: boolean
  error: Error | null
  pdfBlob: Blob | null
  generatePreview: (injectables: Record<string, unknown>) => Promise<void>
  clearError: () => void
  clearPDF: () => void
}

/**
 * Hook para manejar la generación de preview PDF
 */
export function usePreviewPDF({
  templateId,
  versionId,
}: UsePreviewPDFOptions): UsePreviewPDFReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)

  const generatePreview = useCallback(
    async (injectables: Record<string, unknown>) => {
      setIsGenerating(true)
      setError(null)

      try {
        const blob = await previewApi.generate(templateId, versionId, {
          injectables,
        })
        setPdfBlob(blob)
      } catch (err) {
        let errorMessage = 'Error al generar preview'

        if (axios.isAxiosError(err)) {
          if (err.response?.status === 400) {
            errorMessage = 'Datos inválidos. Verifica los valores ingresados.'
          } else if (err.response?.status === 404) {
            errorMessage = 'Template o versión no encontrada.'
          } else if (err.response?.status === 500) {
            errorMessage = 'Error del servidor. Intenta nuevamente.'
          }
        }

        setError(new Error(errorMessage))
      } finally {
        setIsGenerating(false)
      }
    },
    [templateId, versionId]
  )

  const clearError = useCallback(() => setError(null), [])
  const clearPDF = useCallback(() => setPdfBlob(null), [])

  return {
    isGenerating,
    error,
    pdfBlob,
    generatePreview,
    clearError,
    clearPDF,
  }
}
