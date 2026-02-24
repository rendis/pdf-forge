import axios from 'axios'
import { apiClient } from '@/lib/api-client'

export interface GalleryAsset {
  key: string
  name: string
  contentType: string
  size: number
  sha256?: string
  thumbnailUrl?: string
  createdAt: string
}

export interface GalleryListResponse {
  assets: GalleryAsset[]
  total: number
  page: number
  perPage: number
}

export interface GalleryUploadResponse {
  asset: GalleryAsset
}

export interface GalleryURLResponse {
  url: string
}

interface GalleryInitUploadResponse {
  duplicate: boolean
  asset?: GalleryAsset
  uploadId?: string
  signedUrl?: string
  objectKey?: string
  headers?: Record<string, string>
}

interface GalleryCompleteUploadResponse {
  asset: GalleryAsset
}

export type UploadPhase = 'hashing' | 'uploading' | 'completing'

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const galleryApi = {
  list: async (page = 1, perPage = 20): Promise<GalleryListResponse> => {
    const response = await apiClient.get('/workspace/gallery', {
      params: { page, perPage },
    })
    return response.data
  },

  search: async (query: string, page = 1, perPage = 20): Promise<GalleryListResponse> => {
    const response = await apiClient.get('/workspace/gallery/search', {
      params: { q: query, page, perPage },
    })
    return response.data
  },

  /**
   * Three-phase upload: init → PUT to signed URL → complete.
   * SHA-256 dedup: if hash matches existing asset, returns immediately.
   */
  upload: async (
    file: File,
    onProgress?: (phase: UploadPhase, percent: number) => void,
  ): Promise<GalleryUploadResponse> => {
    // Phase 1: Compute SHA-256
    onProgress?.('hashing', 0)
    const sha256 = await computeSHA256(file)
    onProgress?.('hashing', 100)

    // Phase 2: Init upload
    const initResp = await apiClient.post<GalleryInitUploadResponse>(
      '/workspace/gallery/upload/init',
      {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        sha256,
      },
    )

    // Dedup hit — return existing asset
    if (initResp.data.duplicate && initResp.data.asset) {
      return { asset: initResp.data.asset }
    }

    // Phase 3: PUT directly to signed URL (raw axios — no Auth header)
    onProgress?.('uploading', 0)
    await axios.put(initResp.data.signedUrl!, file, {
      headers: {
        'Content-Type': file.type,
        ...initResp.data.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          onProgress?.('uploading', Math.round((progressEvent.loaded / progressEvent.total) * 100))
        }
      },
    })
    onProgress?.('uploading', 100)

    // Phase 4: Complete upload
    onProgress?.('completing', 0)
    const completeResp = await apiClient.post<GalleryCompleteUploadResponse>(
      '/workspace/gallery/upload/complete',
      { uploadId: initResp.data.uploadId },
    )
    onProgress?.('completing', 100)

    return { asset: completeResp.data.asset }
  },

  delete: async (key: string): Promise<void> => {
    await apiClient.delete('/workspace/gallery', {
      params: { key },
    })
  },

  getURL: async (key: string): Promise<string> => {
    const response = await apiClient.get<GalleryURLResponse>('/workspace/gallery/url', {
      params: { key },
    })
    return response.data.url
  },
}
