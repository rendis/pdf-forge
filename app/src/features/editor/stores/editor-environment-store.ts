import { create } from 'zustand'

type EditorEnvironment = 'dev' | 'prod' | null

interface EditorEnvironmentState {
  environment: EditorEnvironment
  setEnvironment: (env: 'dev' | 'prod') => void
  clearEnvironment: () => void
}

export const useEditorEnvironmentStore = create<EditorEnvironmentState>((set) => ({
  environment: null,
  setEnvironment: (env) => set({ environment: env }),
  clearEnvironment: () => set({ environment: null }),
}))
