import { useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContextStore } from '@/stores/app-context-store'
import { useAuthStore } from '@/stores/auth-store'
import { useInjectablesStore } from '../stores/injectables-store'
import { fetchInjectables } from '../api/injectables-api'
import type { Variable } from '../types/variables'
import type { ResolvedGroup } from '../types/injectable-group'

// Module-level deduplication (persists across StrictMode remounts)
let inFlightFetch: Promise<void> | null = null

// Clear store when auth is lost (logout / session expiry)
useAuthStore.subscribe((state, prevState) => {
  if (prevState.token && !state.token) {
    inFlightFetch = null
    useInjectablesStore.getState().reset()
  }
})

export interface UseInjectablesReturn {
  /** List of variables (mapped from injectables, resolved for current locale) */
  variables: Variable[]
  /** Raw injectables from API (i18n maps) */
  injectables: ReturnType<typeof useInjectablesStore.getState>['injectables']
  /** Injectable groups resolved for current locale */
  groups: ResolvedGroup[]
  /** Loading state */
  isLoading: boolean
  /** Error message, if any */
  error: string | null
  /** Refetch injectables from API */
  refetch: () => Promise<void>
}

/**
 * Hook to load and manage injectables (variables) from the API.
 *
 * This hook:
 * - Fetches injectables when a workspace is selected
 * - Automatically reloads when workspace changes
 * - Re-resolves labels client-side when locale changes (no API call)
 * - Returns empty array if no workspace is selected (not an error)
 * - Handles loading and error states
 */
export function useInjectables(): UseInjectablesReturn {
  const { i18n } = useTranslation()
  const currentWorkspace = useAppContextStore((state) => state.currentWorkspace)
  const locale = i18n.language.split('-')[0]

  // Use getState() for actions (stable references)
  const { setFromResponse, setInjectables, setLoading, setError, resolveForLocale } =
    useInjectablesStore.getState()

  // Fetch injectables (only depends on workspace, NOT locale)
  const loadInjectables = useCallback(async () => {
    const workspaceId = currentWorkspace?.id

    if (!workspaceId) {
      setInjectables([], locale)
      return
    }

    if (inFlightFetch) {
      await inFlightFetch
      return
    }

    inFlightFetch = (async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchInjectables()
        setFromResponse(response, locale)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load injectables'
        setError(errorMessage)
        console.error('[useInjectables] Failed to load injectables:', err)
      } finally {
        setLoading(false)
        inFlightFetch = null
      }
    })()

    await inFlightFetch
  }, [currentWorkspace?.id])

  // Load on mount and when workspace changes
  useEffect(() => {
    loadInjectables()
  }, [loadInjectables])

  // Re-resolve labels when locale changes (no API call)
  useEffect(() => {
    resolveForLocale(locale)
  }, [locale])

  // Subscribe to only the values we need to return (not actions)
  const variables = useInjectablesStore((s) => s.variables)
  const injectables = useInjectablesStore((s) => s.injectables)
  const groups = useInjectablesStore((s) => s.groups)
  const isLoading = useInjectablesStore((s) => s.isLoading)
  const error = useInjectablesStore((s) => s.error)

  return {
    variables,
    injectables,
    groups,
    isLoading,
    error,
    refetch: loadInjectables,
  }
}
