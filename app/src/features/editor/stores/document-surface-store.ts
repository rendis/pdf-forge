import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import type { SurfaceKind, DocumentSurfaceLayout } from '../types/document-surface'
import { deriveSurfaceEnabled, normalizeSurfaceContent } from '../utils/document-surface'

export interface DocumentSurfaceState {
  enabled: boolean
  layout: DocumentSurfaceLayout
  imageUrl: string | null
  imageAlt: string
  imageInjectableId: string | null
  imageInjectableLabel: string | null
  imageWidth: number | null
  imageHeight: number | null
  content: JSONContent | null
}

export interface DocumentSurfaceActions {
  setLayout: (layout: DocumentSurfaceLayout) => void
  setImage: (
    url: string,
    alt: string,
    injectableId?: string | null,
    injectableLabel?: string | null,
  ) => void
  setImageDimensions: (width: number | null, height: number | null) => void
  setContent: (content: JSONContent | null) => void
  reset: () => void
  configure: (partial: Partial<DocumentSurfaceState>) => void
}

export type DocumentSurfaceStore = DocumentSurfaceState & DocumentSurfaceActions

const initialState: DocumentSurfaceState = {
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

/**
 * Factory that creates a Zustand store for a header or footer surface.
 * Both surfaces share identical state shape and mutation logic.
 * @param kind - discriminator, reserved for devtools integration
 */
export function createDocumentSurfaceStore(_kind: SurfaceKind) {
  return create<DocumentSurfaceStore>()((set) => ({
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
        enabled: deriveSurfaceEnabled({
          imageUrl,
          imageInjectableId,
          content: state.content,
        }),
      })),

    setImageDimensions: (imageWidth, imageHeight) =>
      set({ imageWidth, imageHeight }),

    setContent: (content) =>
      set((state) => {
        const normalizedContent = normalizeSurfaceContent(content)
        return {
          content: normalizedContent,
          enabled: deriveSurfaceEnabled({
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
          content: partial.content !== undefined
            ? normalizeSurfaceContent(partial.content)
            : state.content,
        }
        return {
          ...nextState,
          enabled: deriveSurfaceEnabled(nextState),
        }
      }),
  }))
}
