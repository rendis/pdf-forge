import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import { deriveHeaderEnabled, normalizeHeaderContent } from '../utils/document-header'
import type { DocumentHeaderLayout } from '../types/document-format'

export type { DocumentHeaderLayout }

export interface DocumentHeaderState {
  enabled: boolean
  layout: DocumentHeaderLayout
  imageUrl: string | null
  imageAlt: string
  imageInjectableId: string | null
  imageInjectableLabel: string | null
  imageWidth: number | null
  imageHeight: number | null
  content: JSONContent | null
}

export interface DocumentHeaderActions {
  setLayout: (layout: DocumentHeaderLayout) => void
  setImage: (
    url: string,
    alt: string,
    injectableId?: string | null,
    injectableLabel?: string | null,
  ) => void
  setImageDimensions: (width: number | null, height: number | null) => void
  setContent: (content: JSONContent | null) => void
  reset: () => void
  configure: (partial: Partial<DocumentHeaderState>) => void
}

export type DocumentHeaderStore = DocumentHeaderState & DocumentHeaderActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: DocumentHeaderState = {
  enabled: false,
  layout: 'image-left',
  imageUrl: null,
  imageAlt: '',
  imageInjectableId: null,
  imageInjectableLabel: null,
  imageWidth: null,
  imageHeight: null,
  content: null,
}

// =============================================================================
// Store
// =============================================================================

export const useDocumentHeaderStore = create<DocumentHeaderStore>()((set) => ({
  ...initialState,

  setLayout: (layout) => set({ layout }),

  setImage: (imageUrl, imageAlt, imageInjectableId = null, imageInjectableLabel = null) =>
    set((state) => ({
      imageUrl: imageUrl || null,
      imageAlt,
      imageInjectableId,
      imageInjectableLabel,
      imageWidth: imageUrl && imageUrl === state.imageUrl ? state.imageWidth : null,
      imageHeight: imageUrl && imageUrl === state.imageUrl ? state.imageHeight : null,
      enabled: deriveHeaderEnabled({
        imageUrl,
        imageInjectableId,
        content: state.content,
      }),
    })),

  setImageDimensions: (imageWidth, imageHeight) =>
    set({
      imageWidth,
      imageHeight,
    }),

  setContent: (content) =>
    set((state) => {
      const normalizedContent = normalizeHeaderContent(content)
      return {
        content: normalizedContent,
        enabled: deriveHeaderEnabled({
          imageUrl: state.imageUrl,
          imageInjectableId: state.imageInjectableId,
          content: normalizedContent,
        }),
      }
    }),

  reset: () => set(initialState),

  configure: (partial) =>
    set((state) => {
      const nextState = {
        ...state,
        ...partial,
        content: partial.content !== undefined ? normalizeHeaderContent(partial.content) : state.content,
      }
      return {
        ...nextState,
        enabled: deriveHeaderEnabled(nextState),
      }
    }),
}))
