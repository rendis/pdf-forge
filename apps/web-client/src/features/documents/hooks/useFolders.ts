import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchFolders,
  fetchFolderTree,
  createFolder,
  updateFolder,
  deleteFolder,
  moveFolder,
  deleteFolders,
  moveFolders,
} from '../api/folders-api'
import type {
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
} from '@/types/api'

// Query keys factory
export const folderKeys = {
  all: ['folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...folderKeys.lists(), workspaceId] as const,
  trees: () => [...folderKeys.all, 'tree'] as const,
  tree: (workspaceId: string) => [...folderKeys.trees(), workspaceId] as const,
}

export function useFolders(workspaceId: string | null) {
  return useQuery({
    queryKey: folderKeys.list(workspaceId ?? ''),
    queryFn: fetchFolders,
    enabled: !!workspaceId,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useFolderTree(workspaceId: string | null) {
  return useQuery({
    queryKey: folderKeys.tree(workspaceId ?? ''),
    queryFn: fetchFolderTree,
    enabled: !!workspaceId,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFolderRequest) => createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
    },
  })
}

export function useUpdateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderId,
      data,
    }: {
      folderId: string
      data: UpdateFolderRequest
    }) => updateFolder(folderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
    },
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (folderId: string) => deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
    },
  })
}

export function useMoveFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderId,
      data,
    }: {
      folderId: string
      data: MoveFolderRequest
    }) => moveFolder(folderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
    },
  })
}

// Batch operations
export function useDeleteFolders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (folderIds: string[]) => deleteFolders(folderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
    },
  })
}

export function useMoveFolders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderIds,
      newParentId,
    }: {
      folderIds: string[]
      newParentId: string | null
    }) => moveFolders(folderIds, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
    },
  })
}
