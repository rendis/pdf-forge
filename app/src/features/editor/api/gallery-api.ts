import { apiClient } from '@/lib/api-client'

export interface GalleryAsset {
  key: string
  name: string
  contentType: string
  size: number
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

  upload: async (file: File): Promise<GalleryUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/workspace/gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
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
