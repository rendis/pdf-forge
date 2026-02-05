/**
 * Runtime auth configuration fetched from backend.
 */

// API Base URL derived from Vite's BASE_URL (auto-configured via VITE_BASE_PATH)
const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || ''
const API_BASE_URL = `${basePath}/api/v1`

export interface PanelProvider {
  name: string
  issuer: string
  tokenEndpoint: string
  userinfoEndpoint: string
  endSessionEndpoint: string
  clientId: string
}

export interface AuthConfig {
  dummyAuth: boolean
  panelProvider?: PanelProvider
}

let cachedConfig: AuthConfig | null = null
let fetchPromise: Promise<AuthConfig> | null = null

/**
 * Fetch auth configuration from backend.
 * Caches the result and deduplicates concurrent requests.
 */
export async function getAuthConfig(): Promise<AuthConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  // Deduplicate concurrent requests
  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/config`)
      if (!response.ok) {
        throw new Error(`Failed to fetch auth config: ${response.status}`)
      }
      cachedConfig = await response.json()
      return cachedConfig!
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

/**
 * Get OIDC configuration for login/token operations.
 */
export function getOIDCConfig(config: AuthConfig): {
  tokenEndpoint: string
  userinfoEndpoint: string
  endSessionEndpoint: string
  clientId: string
} {
  const panel = config.panelProvider

  return {
    tokenEndpoint: panel?.tokenEndpoint || '',
    userinfoEndpoint: panel?.userinfoEndpoint || '',
    endSessionEndpoint: panel?.endSessionEndpoint || '',
    clientId: panel?.clientId || '',
  }
}

/**
 * Clear cached config (useful for testing)
 */
export function clearAuthConfigCache(): void {
  cachedConfig = null
  fetchPromise = null
}
