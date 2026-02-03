import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Folder, Home } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useFolderTree,
  useMoveFolder,
  useMoveFolders,
} from '../hooks/useFolders'
import type { FolderTree } from '@/types/api'
import { cn } from '@/lib/utils'

interface MoveFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderIds: string[]
  workspaceId: string
  onSuccess?: () => void
}

export function MoveFolderDialog({
  open,
  onOpenChange,
  folderIds,
  workspaceId,
  onSuccess,
}: MoveFolderDialogProps) {
  const { t } = useTranslation()
  const { data: tree } = useFolderTree(workspaceId)
  const moveFolder = useMoveFolder()
  const moveFolders = useMoveFolders()

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)

  // Handle dialog open state change and reset selection
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setSelectedParentId(null)
    }
    onOpenChange(isOpen)
  }, [onOpenChange])

  const handleMove = async () => {
    if (folderIds.length === 0) return

    try {
      if (folderIds.length === 1 && folderIds[0]) {
        await moveFolder.mutateAsync({
          folderId: folderIds[0],
          data: { parentId: selectedParentId },
        })
      } else {
        await moveFolders.mutateAsync({
          folderIds,
          newParentId: selectedParentId,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Error is handled by mutation
    }
  }

  // Filter out folders being moved from the tree (can't move a folder into itself or its children)
  const filterTree = (nodes: FolderTree[]): FolderTree[] => {
    return nodes
      .filter((node) => !folderIds.includes(node.id))
      .map((node) => ({
        ...node,
        children: filterTree(node.children || []),
      }))
  }

  const filteredTree = tree ? filterTree(tree) : []

  const renderFolderItem = (folder: FolderTree, depth = 0) => (
    <div key={folder.id}>
      <button
        onClick={() => setSelectedParentId(folder.id)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted',
          selectedParentId === folder.id && 'bg-muted'
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <Folder size={16} className="shrink-0" />
        <span className="truncate">{folder.name}</span>
      </button>
      {folder.children?.map((child) => renderFolderItem(child, depth + 1))}
    </div>
  )

  const isPending = moveFolder.isPending || moveFolders.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('folders.moveDialog.title', 'Move to Folder')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'folders.moveDialog.description',
              'Select a destination folder.'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] rounded-md border">
          {/* Root option */}
          <button
            onClick={() => setSelectedParentId(null)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted',
              selectedParentId === null && 'bg-muted'
            )}
          >
            <Home size={16} className="shrink-0" />
            <span>{t('folders.moveDialog.root', 'Root (No parent)')}</span>
          </button>

          {/* Folder tree */}
          {filteredTree.map((folder) => renderFolderItem(folder))}

          {filteredTree.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t('folders.moveDialog.noFolders', 'No folders available')}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleMove} disabled={isPending}>
            {isPending
              ? t('common.moving', 'Moving...')
              : t('common.move', 'Move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
