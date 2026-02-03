import { useCallback, useMemo } from 'react'
import { useNavigate, useSearch, useParams } from '@tanstack/react-router'
import { useFolderTree } from './useFolders'
import type { Folder, FolderTree } from '@/types/api'

export interface BreadcrumbItem {
  id: string | null
  label: string
}

export interface FolderNavigationState {
  currentFolderId: string | null
  currentFolder: Folder | undefined
  breadcrumbs: BreadcrumbItem[]
  isLoading: boolean
  navigateToFolder: (folderId: string | null) => void
  navigateUp: () => void
}

export function useFolderNavigation(workspaceId: string): FolderNavigationState {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { workspaceId?: string }
  const search = useSearch({ strict: false }) as { folderId?: string }

  const currentFolderId = search.folderId ?? null
  const currentWorkspaceId = params.workspaceId ?? workspaceId

  const { data: tree, isLoading: treeLoading } = useFolderTree(workspaceId)

  // Build breadcrumbs from tree structure and get current node
  const { breadcrumbs, currentNode } = useMemo(() => {
    const path: BreadcrumbItem[] = [{ id: null, label: 'Documents' }]

    if (!currentFolderId || !tree) {
      return { breadcrumbs: path, currentNode: null }
    }

    // Find path to current folder in tree
    const findPath = (
      nodes: FolderTree[],
      targetId: string
    ): FolderTree[] | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return [node]
        }
        if (node.children && node.children.length > 0) {
          const childPath = findPath(node.children, targetId)
          if (childPath) {
            return [node, ...childPath]
          }
        }
      }
      return null
    }

    const folderPath = findPath(tree, currentFolderId)
    if (folderPath) {
      path.push(...folderPath.map((f) => ({ id: f.id, label: f.name })))
      // Return the last node in the path as the current node
      return { breadcrumbs: path, currentNode: folderPath[folderPath.length - 1] }
    }

    return { breadcrumbs: path, currentNode: null }
  }, [tree, currentFolderId])

  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      navigate({
        to: '/workspace/$workspaceId/documents',
        /* eslint-disable @typescript-eslint/no-explicit-any -- TanStack Router type limitation */
        params: { workspaceId: currentWorkspaceId } as any,
        search: folderId ? { folderId } : undefined as any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
      })
    },
    [navigate, currentWorkspaceId]
  )

  const navigateUp = useCallback(() => {
    if (currentNode?.parentId) {
      navigateToFolder(currentNode.parentId)
    } else {
      navigateToFolder(null)
    }
  }, [currentNode, navigateToFolder])

  // Maintain backward compatibility by constructing currentFolder from currentNode
  const currentFolder: Folder | undefined = currentNode
    ? {
        id: currentNode.id,
        name: currentNode.name,
        parentId: currentNode.parentId ?? undefined,
        workspaceId: currentNode.workspaceId,
        createdAt: currentNode.createdAt,
        updatedAt: currentNode.updatedAt,
        // Note: childFolderCount and templateCount are not available in FolderTree
        childFolderCount: 0,
        templateCount: 0,
      }
    : undefined

  return {
    currentFolderId,
    currentFolder,
    breadcrumbs,
    isLoading: treeLoading,
    navigateToFolder,
    navigateUp,
  }
}
