// Components
export { AuthProvider } from './components/AuthProvider'
export { PermissionGuard } from './components/PermissionGuard'

// Hooks
export { usePermission, useCanAccessAdmin } from './hooks/usePermission'

// API
export { fetchMyRoles, recordAccess } from './api/auth-api'

// Types and Rules
export * from './types'
