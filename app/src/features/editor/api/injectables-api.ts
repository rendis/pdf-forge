import apiClient from '@/lib/api-client'
import type { InjectablesListResponse } from '../types/injectable'

/**
 * Fetch injectables for the current workspace.
 * The X-Workspace-ID header is automatically attached by apiClient.
 *
 * @param locale - Locale for group translations (default: 'es')
 * @returns Promise with injectables list response
 */
export async function fetchInjectables(locale?: string): Promise<InjectablesListResponse> {
  const response = await apiClient.get<InjectablesListResponse>('/content/injectables', {
    params: { locale },
  })
  return response.data
}

/**
 * Injectables API object
 */
export const injectablesApi = {
  list: fetchInjectables,
}
