import { apiClient } from '@/lib/api-client'
import type { PreviewRequest } from '../types/preview'

export const previewApi = {
  /**
   * Generate preview PDF for a template version
   *
   * @param templateId - Template UUID
   * @param versionId - Version UUID
   * @param request - Injectable values
   * @returns PDF blob
   */
  generate: async (
    templateId: string,
    versionId: string,
    request: PreviewRequest
  ): Promise<Blob> => {
    const response = await apiClient.post(
      `/content/templates/${templateId}/versions/${versionId}/preview`,
      request,
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const blob = response.data

    if (!(blob instanceof Blob)) {
      throw new Error('Invalid response format')
    }

    if (blob.type !== 'application/pdf') {
      const text = await blob.text()
      throw new Error(text || 'Invalid PDF response')
    }

    return blob
  },
}
