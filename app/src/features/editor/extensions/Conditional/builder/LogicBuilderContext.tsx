import { createContext, useContext } from 'react'
import type { LogicGroup, LogicRule } from '../ConditionalExtension'
import type { InjectorType } from '../../../types/variables'

export interface LogicBuilderContextType {
  variables: { id: string; label: string; type: InjectorType }[]
  updateNode: (nodeId: string, data: Partial<LogicRule | LogicGroup>) => void
  addRule: (parentId: string) => void
  addGroup: (parentId: string) => void
  removeNode: (nodeId: string, parentId: string) => void
}

export const LogicBuilderContext =
  createContext<LogicBuilderContextType | null>(null)

export const useLogicBuilder = () => {
  const context = useContext(LogicBuilderContext)
  if (!context)
    throw new Error('useLogicBuilder must be used within a LogicBuilder')
  return context
}
