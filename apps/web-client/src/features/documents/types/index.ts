// Re-export folder types from central API types
export type {
  Folder,
  FolderTree,
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
} from '@/types/api'

// Document-specific types (local)
export type DocumentStatus = 'DRAFT' | 'FINALIZED' | 'ARCHIVED'

export interface Document {
  id: string
  name: string
  type: DocumentStatus
  size: string
  createdAt: string
  updatedAt: string
  folderId?: string
}
