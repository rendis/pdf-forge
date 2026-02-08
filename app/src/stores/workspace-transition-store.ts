import { create } from 'zustand'

interface WorkspaceTransitionState {
  // Datos del workspace seleccionado
  selectedWorkspace: { id: string; name: string } | null
  // Posición inicial del elemento clickeado
  startPosition: { x: number; y: number; width: number; height: number } | null
  // Fase de animación
  phase: 'idle' | 'toCenter' | 'fadeBorders' | 'fadeOut' | 'complete'
  // Acciones
  startTransition: (workspace: { id: string; name: string }, position: DOMRect) => void
  setPhase: (phase: WorkspaceTransitionState['phase']) => void
  reset: () => void
}

export const useWorkspaceTransitionStore = create<WorkspaceTransitionState>((set) => ({
  selectedWorkspace: null,
  startPosition: null,
  phase: 'idle',

  startTransition: (workspace, position) => set({
    selectedWorkspace: workspace,
    startPosition: { x: position.left, y: position.top, width: position.width, height: position.height },
    phase: 'toCenter',
  }),

  setPhase: (phase) => set({ phase }),

  reset: () => set({
    selectedWorkspace: null,
    startPosition: null,
    phase: 'idle',
  }),
}))
