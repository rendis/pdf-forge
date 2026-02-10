import apiClient from '@/lib/api-client'
import type { InjectablesListResponse } from '../types/injectable'

/**
 * Fetch injectables for the current workspace.
 * The X-Workspace-ID header is automatically attached by apiClient.
 * All locale translations are included in the response (resolved client-side).
 *
 * @returns Promise with injectables list response
 */
export async function fetchInjectables(): Promise<InjectablesListResponse> {
  const response = await apiClient.get<InjectablesListResponse>('/content/injectables')
  return response.data
}

/**
 * Injectables API object
 */
export const injectablesApi = {
  list: fetchInjectables,
}
