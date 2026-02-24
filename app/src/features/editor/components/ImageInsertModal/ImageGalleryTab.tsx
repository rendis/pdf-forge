import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search, Upload, Trash2, ImageIcon, Loader2,
  ChevronLeft, ChevronRight, AlertCircle, X, Expand, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { galleryApi, type GalleryAsset } from '../../api/gallery-api'
import { getAuthConfig } from '@/lib/auth-config'
import type { ImageGalleryTabProps } from './types'

const PER_PAGE = 9

export function ImageGalleryTab({ onSelect }: ImageGalleryTabProps) {
  const { t } = useTranslation()
  const [galleryEnabled, setGalleryEnabled] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)

  // Gallery state
  const [assets, setAssets] = useState<GalleryAsset[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Expanded preview
  const [expandedAsset, setExpandedAsset] = useState<GalleryAsset | null>(null)
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null)

  // Delete confirmation + loading
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if gallery is enabled
  useEffect(() => {
    getAuthConfig()
      .then((config) => {
        setGalleryEnabled(config.features?.gallery ?? false)
        setConfigLoading(false)
      })
      .catch(() => setConfigLoading(false))
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch assets
  useEffect(() => {
    if (!galleryEnabled) return

    const fetchAssets = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = debouncedQuery
          ? await galleryApi.search(debouncedQuery, page, PER_PAGE)
          : await galleryApi.list(page, PER_PAGE)
        setAssets(result.assets)
        setTotal(result.total)
      } catch {
        setError(t('editor.image.gallery.loadError'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssets()
  }, [galleryEnabled, debouncedQuery, page, t])

  // Clear delete confirmation when clicking elsewhere
  useEffect(() => {
    if (!deleteConfirmKey) return
    const timer = setTimeout(() => setDeleteConfirmKey(null), 3000)
    return () => clearTimeout(timer)
  }, [deleteConfirmKey])

  const handleSelect = useCallback(
    (asset: GalleryAsset) => {
      setSelectedKey(asset.key)
      setDeleteConfirmKey(null)
      onSelect({ src: `storage://${asset.key}`, isBase64: false })
    },
    [onSelect],
  )

  const refreshList = useCallback(async () => {
    try {
      const result = debouncedQuery
        ? await galleryApi.search(debouncedQuery, page, PER_PAGE)
        : await galleryApi.list(page, PER_PAGE)
      setAssets(result.assets)
      setTotal(result.total)
    } catch {
      // Ignore refresh errors
    }
  }, [debouncedQuery, page])

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError(t('editor.image.gallery.invalidType'))
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(t('editor.image.gallery.fileTooLarge'))
        return
      }

      setIsUploading(true)
      setError(null)
      try {
        const result = await galleryApi.upload(file)
        // Refresh and select uploaded
        setSearchQuery('')
        setPage(1)
        const listResult = await galleryApi.list(1, PER_PAGE)
        setAssets(listResult.assets)
        setTotal(listResult.total)
        handleSelect(result.asset)
      } catch {
        setError(t('editor.image.gallery.uploadError'))
      } finally {
        setIsUploading(false)
      }
    },
    [t, handleSelect],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
      e.target.value = ''
    },
    [handleUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleUpload(file)
    },
    [handleUpload],
  )

  const handleDeleteClick = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.stopPropagation()
      // First click → show confirmation overlay
      if (deleteConfirmKey !== key) {
        setDeleteConfirmKey(key)
      }
    },
    [deleteConfirmKey],
  )

  const handleDeleteConfirm = useCallback(
    async (key: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setDeletingKey(key)
      try {
        await galleryApi.delete(key)
        if (selectedKey === key) setSelectedKey(null)
        setDeleteConfirmKey(null)
        await refreshList()
      } catch {
        setError(t('editor.image.gallery.deleteError'))
      } finally {
        setDeletingKey(null)
      }
    },
    [selectedKey, refreshList, t],
  )

  const handleDeleteCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmKey(null)
  }, [])

  const handleExpand = useCallback((asset: GalleryAsset, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedAsset(asset)
    setExpandedUrl(asset.thumbnailUrl || null)
    // Load full resolution in background
    galleryApi.getURL(asset.key).then((url) => setExpandedUrl(url)).catch(() => {})
  }, [])

  const totalPages = Math.ceil(total / PER_PAGE)

  // Loading config
  if (configLoading) {
    return (
      <div className="min-h-[280px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Gallery not enabled
  if (!galleryEnabled) {
    return (
      <div className="min-h-[280px] flex flex-col items-center justify-center text-muted-foreground">
        <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">{t('editor.image.gallery.title')}</h3>
        <p className="text-sm text-center max-w-[300px]">
          {t('editor.image.gallery.comingSoon')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search + Upload */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('editor.image.gallery.searchPlaceholder')}
            className="pl-9 h-9 rounded-none"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-none"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t('editor.image.gallery.upload')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Grid */}
      <div
        className={cn(
          'min-h-[220px] transition-colors',
          isDragging && 'border-2 border-dashed border-primary bg-primary/5',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">
              {debouncedQuery
                ? t('editor.image.gallery.noResults')
                : t('editor.image.gallery.empty')}
            </p>
            {!debouncedQuery && (
              <p className="text-xs mt-1">{t('editor.image.gallery.dragHint')}</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {assets.map((asset) => (
              <button
                key={asset.key}
                type="button"
                onClick={() => handleSelect(asset)}
                className={cn(
                  'group relative aspect-square bg-muted overflow-hidden border transition-all',
                  selectedKey === asset.key
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/50',
                )}
              >
                {asset.thumbnailUrl ? (
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}

                {/* Delete confirmation overlay */}
                {deleteConfirmKey === asset.key && (
                  <div className="absolute inset-0 z-10 bg-destructive/90 flex flex-col items-center justify-center gap-2 p-2">
                    {deletingKey === asset.key ? (
                      <Loader2 className="h-5 w-5 animate-spin text-destructive-foreground" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 text-destructive-foreground" />
                        <p className="text-[10px] text-destructive-foreground text-center leading-tight">
                          {t('editor.image.gallery.confirmDelete')}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[10px] rounded-sm"
                            onClick={handleDeleteCancel}
                          >
                            {t('common.cancel')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] rounded-sm bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
                            onClick={(e) => handleDeleteConfirm(asset.key, e)}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Hover overlay with actions */}
                {deleteConfirmKey !== asset.key && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleExpand(asset, e)}
                      title={t('editor.image.gallery.expand')}
                    >
                      <Expand className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleDeleteClick(asset.key, e)}
                      title={t('editor.image.gallery.deleteAsset')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Name overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4">
                  <p className="text-[10px] text-white truncate">{asset.name}</p>
                </div>

                {/* Selection check */}
                {selectedKey === asset.key && (
                  <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('editor.image.gallery.pageInfo', { page, totalPages })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Expanded preview overlay */}
      {expandedAsset && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
          onClick={() => setExpandedAsset(null)}
          onKeyDown={(e) => e.key === 'Escape' && setExpandedAsset(null)}
          role="button"
          tabIndex={0}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="presentation"
          >
            {expandedUrl ? (
              <img
                src={expandedUrl}
                alt={expandedAsset.name}
                className="max-w-full max-h-[85vh] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center w-64 h-64">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            <div className="absolute top-2 right-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpandedAsset(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-black/60 px-3 py-2 text-white text-sm">
              {expandedAsset.name}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
