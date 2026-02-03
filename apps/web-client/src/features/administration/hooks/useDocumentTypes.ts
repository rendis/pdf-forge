import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import * as api from '../api/document-types-api'
import type { UpdateDocumentTypeRequest, DeleteDocumentTypeRequest } from '../api/document-types-api'

export const documentTypeKeys = {
  all: ['document-types'] as const,
  list: (page: number, perPage: number, query?: string) =>
    [...documentTypeKeys.all, 'list', page, perPage, query] as const,
  detail: (id: string) => [...documentTypeKeys.all, 'detail', id] as const,
  byCode: (code: string) => [...documentTypeKeys.all, 'byCode', code] as const,
}

export function useDocumentTypes(page: number, perPage: number, query?: string) {
  return useQuery({
    queryKey: documentTypeKeys.list(page, perPage, query),
    queryFn: () => api.listDocumentTypes(page, perPage, query),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  })
}

export function useDocumentType(id: string) {
  return useQuery({
    queryKey: documentTypeKeys.detail(id),
    queryFn: () => api.getDocumentType(id),
    enabled: !!id,
  })
}

export function useDocumentTypeByCode(code: string) {
  return useQuery({
    queryKey: documentTypeKeys.byCode(code),
    queryFn: () => api.getDocumentTypeByCode(code),
    enabled: !!code,
  })
}

export function useCreateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createDocumentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentTypeKeys.all })
    },
  })
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentTypeRequest }) =>
      api.updateDocumentType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentTypeKeys.all })
    },
  })
}

export function useDeleteDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: DeleteDocumentTypeRequest }) =>
      api.deleteDocumentType(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentTypeKeys.all })
    },
  })
}
