import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSystemInjectables,
  activateSystemInjectable,
  deactivateSystemInjectable,
  listInjectableAssignments,
  createAssignment,
  deleteAssignment,
  excludeAssignment,
  includeAssignment,
  bulkActivate,
  bulkDeactivate,
  bulkCreateAssignments,
  bulkDeleteAssignments,
} from '../api/system-injectables-api'
import type { CreateAssignmentRequest, BulkScopedAssignmentsRequest } from '../types'

export const systemInjectableKeys = {
  all: ['system-injectables'] as const,
  lists: () => [...systemInjectableKeys.all, 'list'] as const,
  assignments: (key: string) => [...systemInjectableKeys.all, 'assignments', key] as const,
}

function useInvalidateInjectables() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: systemInjectableKeys.lists() })
}

function useInvalidateAssignments(key: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: systemInjectableKeys.assignments(key) })
}

// Query: List all system injectables
export function useSystemInjectables() {
  return useQuery({
    queryKey: systemInjectableKeys.lists(),
    queryFn: listSystemInjectables,
    staleTime: 5 * 60 * 1000,
  })
}

// Query: List assignments for a specific injectable
export function useInjectableAssignments(key: string | null) {
  return useQuery({
    queryKey: systemInjectableKeys.assignments(key ?? ''),
    queryFn: () => listInjectableAssignments(key!),
    enabled: !!key,
    staleTime: 2 * 60 * 1000,
  })
}

// Mutation: Activate an injectable globally
export function useActivateSystemInjectable() {
  const onSuccess = useInvalidateInjectables()
  return useMutation({
    mutationFn: activateSystemInjectable,
    onSuccess,
  })
}

// Mutation: Deactivate an injectable globally
export function useDeactivateSystemInjectable() {
  const onSuccess = useInvalidateInjectables()
  return useMutation({
    mutationFn: deactivateSystemInjectable,
    onSuccess,
  })
}

// Mutation: Create a new assignment
export function useCreateAssignment(injectableKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAssignmentRequest) => createAssignment(injectableKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemInjectableKeys.assignments(injectableKey) })
      queryClient.invalidateQueries({ queryKey: systemInjectableKeys.lists() })
    },
  })
}

// Mutation: Delete an assignment
export function useDeleteAssignment(injectableKey: string) {
  const invalidateAssignments = useInvalidateAssignments(injectableKey)
  const invalidateInjectables = useInvalidateInjectables()
  return useMutation({
    mutationFn: (assignmentId: string) => deleteAssignment(injectableKey, assignmentId),
    onSuccess: () => {
      invalidateAssignments()
      invalidateInjectables()
    },
  })
}

// Mutation: Exclude an assignment (is_active = false)
export function useExcludeAssignment(injectableKey: string) {
  const invalidateAssignments = useInvalidateAssignments(injectableKey)
  const invalidateInjectables = useInvalidateInjectables()
  return useMutation({
    mutationFn: (assignmentId: string) => excludeAssignment(injectableKey, assignmentId),
    onSuccess: () => {
      invalidateAssignments()
      invalidateInjectables()
    },
  })
}

// Mutation: Include an assignment (is_active = true)
export function useIncludeAssignment(injectableKey: string) {
  const invalidateAssignments = useInvalidateAssignments(injectableKey)
  const invalidateInjectables = useInvalidateInjectables()
  return useMutation({
    mutationFn: (assignmentId: string) => includeAssignment(injectableKey, assignmentId),
    onSuccess: () => {
      invalidateAssignments()
      invalidateInjectables()
    },
  })
}

// Mutation: Bulk activate
export function useBulkActivate() {
  const invalidateInjectables = useInvalidateInjectables()
  return useMutation({
    mutationFn: bulkActivate,
    onSuccess: invalidateInjectables,
  })
}

// Mutation: Bulk deactivate
export function useBulkDeactivate() {
  const invalidateInjectables = useInvalidateInjectables()
  return useMutation({
    mutationFn: bulkDeactivate,
    onSuccess: invalidateInjectables,
  })
}

// Mutation: Bulk create scoped assignments
export function useBulkCreateAssignments() {
  const invalidateInjectables = useInvalidateInjectables()
  return useMutation({
    mutationFn: (req: BulkScopedAssignmentsRequest) => bulkCreateAssignments(req),
    onSuccess: invalidateInjectables,
  })
}

// Mutation: Bulk delete scoped assignments
export function useBulkDeleteAssignments() {
  const invalidateInjectables = useInvalidateInjectables()
  return useMutation({
    mutationFn: (req: BulkScopedAssignmentsRequest) => bulkDeleteAssignments(req),
    onSuccess: invalidateInjectables,
  })
}
