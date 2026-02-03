import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addTagsToTemplate,
  removeTagFromTemplate,
  assignDocumentType,
  type TemplatesListParams,
  type AssignDocumentTypeRequest,
} from '../api/templates-api'
import { templateDetailKeys } from './useTemplateDetail'
import type { CreateTemplateRequest, UpdateTemplateRequest } from '@/types/api'

export const templateKeys = {
  all: ['templates'] as const,
  list: (params: TemplatesListParams) =>
    [...templateKeys.all, 'list', params] as const,
}

export function useTemplates(params: TemplatesListParams = {}) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => fetchTemplates(params),
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string
      data: UpdateTemplateRequest
    }) => updateTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: templateDetailKeys.all })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}

export function useAddTagsToTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      tagIds,
    }: {
      templateId: string
      tagIds: string[]
    }) => addTagsToTemplate(templateId, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: templateDetailKeys.all })
    },
  })
}

export function useRemoveTagFromTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, tagId }: { templateId: string; tagId: string }) =>
      removeTagFromTemplate(templateId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: templateDetailKeys.all })
    },
  })
}

export function useAssignDocumentType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string
      data: AssignDocumentTypeRequest
    }) => assignDocumentType(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: templateDetailKeys.all })
    },
  })
}
