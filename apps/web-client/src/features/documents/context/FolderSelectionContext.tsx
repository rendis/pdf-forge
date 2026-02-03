import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

interface FolderSelectionContextValue {
  selectedIds: Set<string>
  isSelecting: boolean
  toggleSelection: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  startSelecting: () => void
  stopSelecting: () => void
  isSelected: (id: string) => boolean
}

const FolderSelectionContext =
  createContext<FolderSelectionContextValue | null>(null)

export function FolderSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const startSelecting = useCallback(() => {
    setIsSelecting(true)
  }, [])

  const stopSelecting = useCallback(() => {
    setIsSelecting(false)
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id)
    },
    [selectedIds]
  )

  return (
    <FolderSelectionContext.Provider
      value={{
        selectedIds,
        isSelecting,
        toggleSelection,
        selectAll,
        clearSelection,
        startSelecting,
        stopSelecting,
        isSelected,
      }}
    >
      {children}
    </FolderSelectionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFolderSelection() {
  const context = useContext(FolderSelectionContext)
  if (!context) {
    throw new Error(
      'useFolderSelection must be used within FolderSelectionProvider'
    )
  }
  return context
}
