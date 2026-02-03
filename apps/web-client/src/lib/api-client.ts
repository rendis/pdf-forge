import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { useAppContextStore } from '@/stores/app-context-store'

import { refreshAccessToken } from '@/lib/oidc'

// API Base URL from environment (default: relative URL for embedded frontend)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

/**
 * Create Axios instance with base configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

/**
 * Request interceptor - Add auth token and context headers
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add Authorization header
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add context headers
    const { currentTenant, currentWorkspace } = useAppContextStore.getState()

    if (currentTenant?.id) {
      config.headers['X-Tenant-ID'] = currentTenant.id
    }

    if (currentWorkspace?.id) {
      config.headers['X-Workspace-ID'] = currentWorkspace.id
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor - Handle errors globally with token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Handle 401 Unauthorized - Try to refresh token first
    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refreshToken } = useAuthStore.getState()

      // If no refresh token, clear auth and reject immediately
      if (!refreshToken) {
        console.warn('[API] 401 without refresh token - clearing auth')
        useAuthStore.getState().clearAuth()
        // Note: Root route guard will handle redirect to /login
        return Promise.reject(error)
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            // Update the token in the original request
            const newToken = useAuthStore.getState().token
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await refreshAccessToken()
        processQueue(null)

        // Update the token in the original request
        const newToken = useAuthStore.getState().token
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }

        return apiClient(originalRequest)
      } catch (refreshError) {
        console.error('[API] Token refresh failed - clearing auth')
        processQueue(refreshError as Error)
        useAuthStore.getState().clearAuth()
        // Note: Root route guard will handle redirect to /login
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data)
    }

    return Promise.reject(error)
  }
)

/**
 * API Error response type
 */
export interface ApiError {
  code: string
  error: string
  message: string
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

/**
 * Extract error message from API error
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined
    return apiError?.error || apiError?.message || error.message || 'An unexpected error occurred'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}

export default apiClient
