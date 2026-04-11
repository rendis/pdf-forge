/**
 * Shared surface types for header and footer.
 * Both surfaces share the same config shape, layout options, and behavior.
 */

export type SurfaceKind = 'header' | 'footer'

export type DocumentSurfaceLayout = 'image-left' | 'image-right' | 'image-center'

export interface DocumentSurfaceConfig {
  enabled: boolean
  layout?: DocumentSurfaceLayout
  imageUrl?: string | null
  imageAlt?: string
  imageInjectableId?: string | null
  imageInjectableLabel?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  content?: import('@tiptap/core').JSONContent
}
