import { useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContextStore } from '@/stores/app-context-store'
import { useInjectablesStore } from '../stores/injectables-store'
import { fetchInjectables } from '../api/injectables-api'
import type { Variable } from '../types/variables'
import type { InjectableGroup } from '../types/injectable-group'

// Module-level deduplication (persists across StrictMode remounts)
let inFlightFetch: Promise<void> | null = null
let lastFetchedWorkspaceId: string | null = null
let lastFetchedLocale: string | null = null

export interface UseInjectablesReturn {
  /** List of variables (mapped from injectables) */
  variables: Variable[]
  /** Raw injectables from API */
  injectables: ReturnType<typeof useInjectablesStore.getState>['injectables']
  /** Injectable groups for visual organization */
  groups: InjectableGroup[]
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
 * - Returns empty array if no workspace is selected (not an error)
 * - Handles loading and error states
 *
 * @example
 * ```tsx
 * const { variables, isLoading, error, refetch } = useInjectables()
 *
 * if (isLoading) return <Spinner />
 * if (error) return <ErrorMessage>{error}</ErrorMessage>
 *
 * return <DocumentEditor variables={variables} />
 * ```
 */
export function useInjectables(): UseInjectablesReturn {
  const { i18n } = useTranslation()
  const currentWorkspace = useAppContextStore((state) => state.currentWorkspace)

  const { setFromResponse, setInjectables, setLoading, setError } = useInjectablesStore()
  const locale = i18n.language.split('-')[0] // "en-US" -> "en"

  const loadInjectables = useCallback(async () => {
    const workspaceId = currentWorkspace?.id

    // Skip if no workspace selected (not an error condition)
    if (!workspaceId) {
      setInjectables([])
      return
    }

    // Skip if already loaded for this workspace and locale (module-level check)
    if (lastFetchedWorkspaceId === workspaceId && lastFetchedLocale === locale) {
      return
    }

    // If request already in-flight, wait for it instead of making a new one
    if (inFlightFetch) {
      await inFlightFetch
      return
    }

    // Create and track the fetch promise for deduplication
    inFlightFetch = (async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchInjectables(locale)
        setFromResponse(response)
        lastFetchedWorkspaceId = workspaceId
        lastFetchedLocale = locale
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
  }, [currentWorkspace?.id, setFromResponse, setInjectables, setLoading, setError, locale])

  // Load on mount and when workspace changes
  useEffect(() => {
    loadInjectables()
  }, [loadInjectables])

  // Get current state from store
  const store = useInjectablesStore.getState()

  return {
    variables: store.variables,
    injectables: store.injectables,
    groups: store.groups,
    isLoading: store.isLoading,
    error: store.error,
    refetch: loadInjectables,
  }
}
