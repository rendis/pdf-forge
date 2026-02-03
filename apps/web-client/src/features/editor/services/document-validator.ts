/**
 * Document Semantic Validator
 *
 * Validates semantic consistency of documents beyond schema validation.
 * This must replicate the exact validation from the old system (web-client).
 *
 * Checks references between variables, roles, and content.
 * Variables are validated against the backend variable list (if provided).
 */

import type {
  PortableDocument,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ImportOptions,
  ProseMirrorNode,
  BackendVariable,
} from '../types/document-format'

// =============================================================================
// Types
// =============================================================================

interface ValidationContext {
  /** Variable IDs defined in the document */
  documentVariableIds: Set<string>
  /** Variable IDs available from backend (source of truth) */
  backendVariableIds: Set<string>
  errors: ValidationError[]
  warnings: ValidationWarning[]
  options: ImportOptions
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Creates a new validation context
 */
function createContext(
  document: PortableDocument,
  options: ImportOptions,
  backendVariables: BackendVariable[] = []
): ValidationContext {
  return {
    documentVariableIds: new Set(document.variableIds ?? []),
    backendVariableIds: new Set(backendVariables.map((v) => v.variableId)),
    errors: [],
    warnings: [],
    options,
  }
}

/**
 * Adds an error to the context
 */
function _addError(
  context: ValidationContext,
  code: string,
  path: string,
  message: string
): void {
  context.errors.push({ code, path, message })
}

/**
 * Adds a warning to the context
 */
function addWarning(
  context: ValidationContext,
  code: string,
  path: string,
  message: string,
  suggestion?: string
): void {
  context.warnings.push({ code, path, message, suggestion })
}

// =============================================================================
// Content Validators
// =============================================================================

/**
 * Validates injector variable references
 * Checks that variables exist in the document's variableIds list
 * and optionally in the backend variable list
 */
function validateInjectorReferences(
  content: ProseMirrorNode[],
  context: ValidationContext,
  path: string = 'content'
): void {
  for (let i = 0; i < content.length; i++) {
    const node = content[i]
    const nodePath = `${path}.content[${i}]`

    if (node.type === 'injector') {
      const variableId = node.attrs?.variableId as string | undefined

      if (variableId) {
        // Check if variable is in document's variableIds list
        if (!context.documentVariableIds.has(variableId)) {
          addWarning(
            context,
            'UNDEFINED_VARIABLE',
            `${nodePath}.attrs.variableId`,
            `Variable "${variableId}" referenciada en inyector no está en variableIds del documento`,
            'Añade el ID de la variable a la lista variableIds'
          )
        }

        // Check if variable exists in backend (if backend variables provided)
        if (
          context.backendVariableIds.size > 0 &&
          !context.backendVariableIds.has(variableId)
        ) {
          addWarning(
            context,
            'ORPHANED_VARIABLE',
            `${nodePath}.attrs.variableId`,
            `Variable "${variableId}" no existe en el backend`,
            'La variable puede haber sido eliminada o el ID es incorrecto'
          )
        }
      }
    }

    // Recurse into child content
    if (node.content) {
      validateInjectorReferences(node.content, context, nodePath)
    }
  }
}

/**
 * Validates conditional variable references
 */
function validateConditionalReferences(
  content: ProseMirrorNode[],
  context: ValidationContext,
  path: string = 'content'
): void {
  for (let i = 0; i < content.length; i++) {
    const node = content[i]
    const nodePath = `${path}.content[${i}]`

    if (node.type === 'conditional') {
      const conditions = node.attrs?.conditions

      if (conditions) {
        validateConditionGroupReferences(
          conditions,
          context,
          `${nodePath}.attrs.conditions`
        )
      }
    }

    // Recurse into child content
    if (node.content) {
      validateConditionalReferences(node.content, context, nodePath)
    }
  }
}

/**
 * Recursively validates condition group variable references
 */
function validateConditionGroupReferences(
  group: unknown,
  context: ValidationContext,
  path: string
): void {
  if (!group || typeof group !== 'object') return

  const g = group as {
    type?: string
    variableId?: string
    children?: unknown[]
    value?: { mode?: string; value?: string }
  }

  if (g.type === 'rule') {
    // Check rule variable reference
    if (g.variableId) {
      if (!context.documentVariableIds.has(g.variableId)) {
        addWarning(
          context,
          'UNDEFINED_CONDITION_VARIABLE',
          `${path}.variableId`,
          `Variable "${g.variableId}" usada en condición no está en variableIds`,
          'Añade el ID de la variable a la lista variableIds'
        )
      }

      // Check if variable exists in backend
      if (
        context.backendVariableIds.size > 0 &&
        !context.backendVariableIds.has(g.variableId)
      ) {
        addWarning(
          context,
          'ORPHANED_CONDITION_VARIABLE',
          `${path}.variableId`,
          `Variable "${g.variableId}" usada en condición no existe en el backend`,
          'La variable puede haber sido eliminada'
        )
      }
    }

    // Check value variable reference (if mode is 'variable')
    if (g.value?.mode === 'variable' && g.value?.value) {
      if (!context.documentVariableIds.has(g.value.value)) {
        addWarning(
          context,
          'UNDEFINED_CONDITION_VALUE_VARIABLE',
          `${path}.value.value`,
          `Variable "${g.value.value}" usada como valor de comparación no está en variableIds`,
          'Añade el ID de la variable o usa un valor de texto'
        )
      }

      // Check if variable exists in backend
      if (
        context.backendVariableIds.size > 0 &&
        !context.backendVariableIds.has(g.value.value)
      ) {
        addWarning(
          context,
          'ORPHANED_CONDITION_VALUE_VARIABLE',
          `${path}.value.value`,
          `Variable "${g.value.value}" usada como valor no existe en el backend`,
          'La variable puede haber sido eliminada'
        )
      }
    }
  }

  if (g.type === 'group' && Array.isArray(g.children)) {
    for (let i = 0; i < g.children.length; i++) {
      validateConditionGroupReferences(
        g.children[i],
        context,
        `${path}.children[${i}]`
      )
    }
  }
}

// =============================================================================
// Image Validators
// =============================================================================

/**
 * Validates image sizes in content
 */
function validateImageSizes(
  content: ProseMirrorNode[],
  context: ValidationContext,
  path: string = 'content'
): void {
  const maxSize = context.options.maxImageSize || 5 * 1024 * 1024 // 5MB default

  for (let i = 0; i < content.length; i++) {
    const node = content[i]
    const nodePath = `${path}.content[${i}]`

    if (node.type === 'image') {
      const src = node.attrs?.src as string | undefined

      if (src?.startsWith('data:')) {
        const sizeEstimate = estimateBase64Size(src)

        if (sizeEstimate > maxSize) {
          addWarning(
            context,
            'IMAGE_TOO_LARGE',
            `${nodePath}.attrs.src`,
            `Imagen excede el tamaño máximo permitido (${formatBytes(sizeEstimate)} > ${formatBytes(maxSize)})`,
            'Reduce el tamaño de la imagen antes de importar'
          )
        }
      }
    }

    // Recurse into child content
    if (node.content) {
      validateImageSizes(node.content, context, nodePath)
    }
  }
}

/**
 * Estimates the byte size of a base64 data URI
 */
function estimateBase64Size(dataUri: string): number {
  // Remove the data URI prefix (e.g., "data:image/png;base64,")
  const base64Part = dataUri.split(',')[1] || ''

  // Base64 encodes 3 bytes in 4 characters
  return Math.floor((base64Part.length * 3) / 4)
}

/**
 * Formats bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validates document semantics beyond schema validation
 * If backendVariables is provided, also validates that referenced variables exist in the backend
 */
export function validateDocumentSemantics(
  document: PortableDocument,
  options: ImportOptions = {},
  backendVariables: BackendVariable[] = []
): ValidationResult {
  const context = createContext(document, options, backendVariables)

  // Validate content references
  validateInjectorReferences(document.content.content, context)
  validateConditionalReferences(document.content.content, context)

  // Validate image sizes
  validateImageSizes(document.content.content, context)

  return {
    valid: context.errors.length === 0,
    errors: context.errors,
    warnings: context.warnings,
  }
}

/**
 * Quick check if document has any undefined references
 */
export function hasUndefinedReferences(
  document: PortableDocument,
  backendVariables: BackendVariable[] = []
): boolean {
  const result = validateDocumentSemantics(document, {}, backendVariables)
  return result.warnings.some(
    (w) => w.code.includes('UNDEFINED') || w.code.includes('ORPHANED')
  )
}

/**
 * Gets all variable IDs used in the document content
 */
export function getUsedVariableIds(document: PortableDocument): string[] {
  const ids = new Set<string>()

  function traverse(nodes: ProseMirrorNode[]) {
    for (const node of nodes) {
      if (node.type === 'injector' && node.attrs?.variableId) {
        ids.add(node.attrs.variableId as string)
      }

      if (node.type === 'conditional' && node.attrs?.conditions) {
        collectConditionVariables(node.attrs.conditions, ids)
      }

      if (node.content) {
        traverse(node.content)
      }
    }
  }

  function collectConditionVariables(group: unknown, ids: Set<string>) {
    if (!group || typeof group !== 'object') return

    const g = group as {
      type?: string
      variableId?: string
      children?: unknown[]
      value?: { mode?: string; value?: string }
    }

    if (g.type === 'rule' && g.variableId) {
      ids.add(g.variableId)
    }

    if (g.value?.mode === 'variable' && g.value?.value) {
      ids.add(g.value.value)
    }

    if (g.type === 'group' && Array.isArray(g.children)) {
      for (const child of g.children) {
        collectConditionVariables(child, ids)
      }
    }
  }

  traverse(document.content.content)
  return Array.from(ids)
}

/**
 * Gets variable IDs that are in the document but not in the backend
 */
export function getOrphanedVariableIds(
  document: PortableDocument,
  backendVariables: BackendVariable[]
): string[] {
  const backendIds = new Set(backendVariables.map((v) => v.variableId))
  return document.variableIds.filter((id) => !backendIds.has(id))
}
