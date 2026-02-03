import { Paginator } from '@/components/ui/paginator'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, FileType, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocumentTypes } from '../hooks/useDocumentTypes'
import type { DocumentType } from '../api/document-types-api'
import { DocumentTypeFormDialog } from './DocumentTypeFormDialog'
import { DeleteDocumentTypeDialog } from './DeleteDocumentTypeDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const TH_CLASS =
  'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'
const ITEMS_PER_PAGE = 10
const DEBOUNCE_MS = 300

function getLocalizedName(name: Record<string, string>, locale: string): string {
  return name[locale] || name['es'] || name['en'] || Object.values(name)[0] || ''
}

export function DocumentTypesTab(): React.ReactElement {
  const { t, i18n } = useTranslation()

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery])

  const { data, isLoading, error, isFetching } = useDocumentTypes(
    page,
    ITEMS_PER_PAGE,
    debouncedQuery.length >= 3 ? debouncedQuery : undefined
  )

  const documentTypes = data?.data ?? []
  const totalPages = data?.pagination?.totalPages ?? 1

  const handleEdit = (docType: DocumentType) => {
    setSelectedDocumentType(docType)
    setEditDialogOpen(true)
  }

  const handleDelete = (docType: DocumentType) => {
    setSelectedDocumentType(docType)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t(
            'administration.documentTypes.description',
            'Manage document types and their configurations.'
          )}
        </p>
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <Plus size={16} />
          {t('administration.documentTypes.create', 'Create Type')}
        </button>
      </div>

      {/* Search */}
      <div className="group relative w-full md:max-w-xs">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
          size={18}
        />
        <input
          type="text"
          placeholder={t('administration.documentTypes.searchPlaceholder', 'Search document types...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-7 pr-4 text-sm font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
        />
        <p className={`absolute left-0 top-full pt-1 text-xs text-muted-foreground transition-opacity duration-200 ${searchQuery.length > 0 && searchQuery.length < 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {t('common.searchMinChars', 'Type at least 3 characters to search')}
        </p>
      </div>

      <div className="rounded-sm border">
        {/* Loading State */}
        {isLoading && (
          <div className="divide-y">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertTriangle size={32} className="mb-3 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {t('administration.documentTypes.loadError', 'Failed to load document types')}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && documentTypes.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileType size={32} className="mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {debouncedQuery.length >= 3
                ? t('administration.documentTypes.noResults', 'No document types match your search')
                : t('administration.documentTypes.empty', 'No document types found')}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && documentTypes.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className={TH_CLASS}>
                  {t('administration.documentTypes.columns.code', 'Code')}
                </th>
                <th className={TH_CLASS}>
                  {t('administration.documentTypes.columns.name', 'Name')}
                </th>
                <th className={TH_CLASS}>
                  {t('administration.documentTypes.columns.templates', 'Templates')}
                </th>
                <th className={`${TH_CLASS} w-12`}>
                  {t('administration.documentTypes.columns.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className={isFetching ? 'opacity-50' : undefined}>
              {documentTypes.map((docType) => (
                <tr key={docType.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs uppercase">
                      {docType.code}
                    </span>
                  </td>
                  <td className="p-4 font-medium">
                    {getLocalizedName(docType.name, i18n.language)}
                  </td>
                  <td className="p-4 font-mono text-sm text-muted-foreground">
                    {docType.templatesCount ?? 0}
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-sm p-1 hover:bg-muted">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(docType)}>
                          <Pencil size={14} className="mr-2" />
                          {t('common.edit', 'Edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(docType)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 size={14} className="mr-2" />
                          {t('common.delete', 'Delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginator */}
      {!isLoading && !error && (
        <Paginator
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          disabled={isFetching}
          className="py-2"
        />
      )}

      {/* Create Dialog */}
      <DocumentTypeFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
      />

      {/* Edit Dialog */}
      <DocumentTypeFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        documentType={selectedDocumentType}
      />

      {/* Delete Dialog */}
      <DeleteDocumentTypeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        documentType={selectedDocumentType}
      />
    </div>
  )
}
