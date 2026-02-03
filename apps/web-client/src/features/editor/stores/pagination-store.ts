import { create } from 'zustand'
import type { PageMargins, PageSize } from '../types'
import { PAGE_SIZES, DEFAULT_MARGINS } from '../types'

// =============================================================================
// Types
// =============================================================================

export interface PaginationState {
  pageSize: PageSize
  margins: PageMargins
}

export interface PaginationActions {
  setPageSize: (size: PageSize) => void
  setMargins: (margins: PageMargins) => void
  reset: () => void
}

export type PaginationStore = PaginationState & PaginationActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: PaginationState = {
  pageSize: PAGE_SIZES.A4,
  margins: DEFAULT_MARGINS,
}

// =============================================================================
// Store
// =============================================================================

export const usePaginationStore = create<PaginationStore>()((set) => ({
  ...initialState,

  setPageSize: (pageSize) => set({ pageSize }),

  setMargins: (margins) => set({ margins }),

  reset: () => set(initialState),
}))

// =============================================================================
// Selectors
// =============================================================================

/**
 * Selector para obtener la configuración de página
 */
export const selectPageConfig = (state: PaginationStore) => ({
  pageSize: state.pageSize,
  margins: state.margins,
})

/**
 * Selector para obtener las dimensiones de página
 */
export const selectPageDimensions = (state: PaginationStore) => ({
  width: state.pageSize.width,
  height: state.pageSize.height,
})
