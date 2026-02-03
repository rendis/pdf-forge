/**
 * Request payload para el endpoint de preview
 */
export interface PreviewRequest {
  /**
   * Map de variableId → valor
   * Ejemplos:
   * - "cliente_nombre" → "Juan Pérez"
   * - "ROLE.Cliente.email" → "juan@email.com"
   * - "precio" → 1500.50
   * - "activo" → true
   */
  injectables: Record<string, unknown>
}

/**
 * Valores del formulario de injectables
 */
export interface InjectableFormValues {
  [variableId: string]: unknown
}

/**
 * Errores de validación del formulario
 */
export interface InjectableFormErrors {
  [variableId: string]: string
}

/**
 * Estado del formulario de preview
 */
export interface PreviewFormState {
  values: InjectableFormValues
  errors: InjectableFormErrors
  touched: Set<string>
}
