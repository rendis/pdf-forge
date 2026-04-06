import type { Variable } from '../types'
import type { VariableDragData } from '../types/drag'
import { hasConfigurableOptions } from '../types/injectable'

export type ActiveSurface = 'header' | 'body'

export interface PendingVariableState {
  variable: Variable
  position: number
}

export interface VariableInsertPlan {
  command: 'setInjector' | 'setTableInjector' | 'setListInjector'
  position: number
  requiresFormat: boolean
  targetSurface: ActiveSurface
}

interface BuildVariableInsertPlanParams {
  data: VariableDragData
  targetSurface: ActiveSurface
  targetSelection: number
  bodySelection: number
  position?: number
}

export function resolveActiveSurface(
  showHeaderSurface: boolean,
  activeSurface: ActiveSurface
): ActiveSurface {
  return !showHeaderSurface && activeSurface === 'header' ? 'body' : activeSurface
}

export function resolveVariableTargetSurface(
  activeSurface: ActiveSurface,
  hasHeaderEditor: boolean
): ActiveSurface {
  return activeSurface === 'header' && hasHeaderEditor ? 'header' : 'body'
}

export function buildPendingVariableState(
  data: VariableDragData,
  position: number
): PendingVariableState {
  return {
    variable: {
      id: data.id,
      variableId: data.variableId,
      label: data.label,
      type: data.injectorType,
      formatConfig: data.formatConfig,
      sourceType: data.sourceType ?? 'EXTERNAL',
      description: data.description,
    },
    position,
  }
}

export function buildVariableInsertPlan({
  data,
  targetSurface,
  targetSelection,
  bodySelection,
  position,
}: BuildVariableInsertPlanParams): VariableInsertPlan {
  if (data.injectorType === 'TABLE') {
    return {
      command: 'setTableInjector',
      position: position ?? bodySelection,
      requiresFormat: false,
      targetSurface: 'body',
    }
  }

  if (data.injectorType === 'LIST') {
    return {
      command: 'setListInjector',
      position: position ?? bodySelection,
      requiresFormat: false,
      targetSurface: 'body',
    }
  }

  return {
    command: 'setInjector',
    position: position ?? targetSelection,
    requiresFormat: hasConfigurableOptions(data.formatConfig),
    targetSurface,
  }
}
