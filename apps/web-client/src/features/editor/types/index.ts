// Page types
export interface PageSize {
  width: number
  height: number
  label: string
}

export interface PageMargins {
  top: number
  bottom: number
  left: number
  right: number
}

export interface PageSettings {
  pageSize: PageSize
  margins: PageMargins
}

// Límites de márgenes para evitar bugs de paginación
export const MARGIN_LIMITS = {
  min: 50,
  max: 200,
} as const

// Solo formatos estándar para documentos de firma digital
export const PAGE_SIZES: Record<string, PageSize> = {
  A4: { width: 794, height: 1123, label: 'A4' },
  LETTER: { width: 818, height: 1060, label: 'Letter' },
  LEGAL: { width: 818, height: 1404, label: 'Legal' },
}

export const DEFAULT_MARGINS: PageMargins = {
  top: 96,
  bottom: 96,
  left: 96,
  right: 96,
}

// Variables and injectables
export * from './variables'
export * from './injectable'
export * from './document-format'
