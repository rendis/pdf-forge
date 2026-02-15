import type { CreateVersionFromExistingRequest, CreateVersionRequest } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    createVersion,
    createVersionFromExisting,
    fetchTemplateWithVersions,
    versionsApi,
} from '../api/templates-api'
import type { UpdateVersionRequest } from '../types'
import { templateKeys } from './useTemplates'

export const templateDetailKeys = {
  all: ['template-detail'] as const,
  detail: (templateId: string) =>
    [...templateDetailKeys.all, templateId] as const,
}

export function useTemplateWithVersions(templateId: string) {
  return useQuery({
    queryKey: templateDetailKeys.detail(templateId),
    queryFn: () => fetchTemplateWithVersions(templateId),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,     // 10 minutes
  })
}

export function useCreateVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVersionRequest) => createVersion(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
      // Also invalidate the templates list to update version count
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}

export function useCloneVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVersionFromExistingRequest) =>
      createVersionFromExisting(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
      // Also invalidate the templates list to update version count
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}

export function usePublishVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) => versionsApi.publish(templateId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}

export function useSchedulePublishVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ versionId, publishAt }: { versionId: string; publishAt: string }) =>
      versionsApi.schedulePublish(templateId, versionId, publishAt),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
    },
  })
}

export function useCancelSchedule(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) => versionsApi.cancelSchedule(templateId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
    },
  })
}

export function useArchiveVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) => versionsApi.archive(templateId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}

export function useDeleteVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) => versionsApi.delete(templateId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}

export function useUpdateVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ versionId, data }: { versionId: string; data: UpdateVersionRequest }) =>
      versionsApi.update(templateId, versionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
    },
  })
}
