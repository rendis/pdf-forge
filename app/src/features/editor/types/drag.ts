import type { InjectorType } from './variables'
import type { FormatConfig } from './injectable'

/**
 * Data structure passed through @dnd-kit drag context
 * when dragging a variable from the VariablesPanel
 */
export interface VariableDragData {
  /**
   * Unique identifier for this drag item
   * For regular variables: same as variableId
   * For role variables: "role_{roleId}_{propertyKey}"
   */
  id: string

  /**
   * Type of drag item
   * - 'variable': Regular injectable variable
   * - 'role-variable': Role property injectable (e.g., Cliente.nombre)
   */
  itemType: 'variable' | 'role-variable'

  /**
   * Unique identifier of the variable
   * For regular variables: the key from API
   * For role variables: "ROLE.{roleId}.{propertyKey}"
   */
  variableId: string

  /**
   * Display label for the variable
   * e.g., "Nombre del Cliente" or "Cliente.nombre"
   */
  label: string

  /**
   * Data type of the variable
   */
  injectorType: InjectorType

  /**
   * Optional format configuration
   * Used for DATE, CURRENCY, etc. with format options
   */
  formatConfig?: FormatConfig

  /**
   * Source type for regular variables (INTERNAL or EXTERNAL)
   */
  sourceType?: 'INTERNAL' | 'EXTERNAL'

  /**
   * Optional description for info tooltip display
   */
  description?: string

  /**
   * Role-specific properties (only for itemType: 'role-variable')
   */
  roleId?: string
  roleLabel?: string
  propertyKey?: string
  propertyLabel?: string
}

/**
 * Active drag state for the VariablesPanel
 */
export interface VariablesPanelDragState {
  /**
   * ID of the currently dragged item
   */
  activeId: string | null

  /**
   * Data of the currently dragged item
   */
  activeData: VariableDragData | null
}
