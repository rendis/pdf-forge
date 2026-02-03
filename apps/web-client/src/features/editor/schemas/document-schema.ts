/**
 * Zod schemas for validating Portable Document format
 *
 * This must replicate the exact validation from the old system (web-client)
 * to ensure compatibility with the backend.
 */

import { z } from 'zod'
import { DOCUMENT_FORMAT_VERSION } from '../types/document-format'

// =============================================================================
// Base Schemas
// =============================================================================

export const VariableTypeSchema = z.enum([
  'TEXT',
  'NUMBER',
  'DATE',
  'CURRENCY',
  'BOOLEAN',
  'IMAGE',
  'TABLE',
  'ROLE_TEXT',
])

export const LanguageSchema = z.enum(['en', 'es'])

export const PageFormatIdSchema = z
  .string()
  .transform((val) => val.toUpperCase())
  .pipe(z.enum(['A4', 'LETTER', 'LEGAL', 'CUSTOM']))

// =============================================================================
// Document Metadata Schema
// =============================================================================

export const DocumentMetaSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  language: LanguageSchema,
  customFields: z.record(z.string(), z.string()).optional(),
})

// =============================================================================
// Page Configuration Schema
// =============================================================================

export const PageMarginsSchema = z.object({
  top: z.number().min(0),
  bottom: z.number().min(0),
  left: z.number().min(0),
  right: z.number().min(0),
})

export const PageConfigSchema = z.object({
  formatId: PageFormatIdSchema,
  width: z.number().positive('El ancho debe ser positivo'),
  height: z.number().positive('La altura debe ser positiva'),
  margins: PageMarginsSchema,
})

// =============================================================================
// Backend Variable Schema (for validation of backend data)
// =============================================================================

export const VariableValidationSchema = z.object({
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  pattern: z.string().optional(),
  allowedValues: z.array(z.string()).optional(),
})

/**
 * Schema for backend variable definitions
 * Used to validate variables received from the API
 */
export const BackendVariableSchema = z.object({
  id: z.string().min(1),
  variableId: z.string().min(1),
  label: z.string().min(1),
  type: VariableTypeSchema,
  required: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  format: z.string().optional(),
  validation: VariableValidationSchema.optional(),
})

/**
 * Schema for variable ID (just a string reference)
 * This is what gets stored in the document
 */
export const VariableIdSchema = z.string().min(1)

// =============================================================================
// Conditional Logic Schema
// =============================================================================

export const RuleOperatorSchema = z.enum([
  'eq',
  'neq',
  'empty',
  'not_empty',
  'starts_with',
  'ends_with',
  'contains',
  'gt',
  'lt',
  'gte',
  'lte',
  'before',
  'after',
  'is_true',
  'is_false',
])

export const RuleValueModeSchema = z.enum(['text', 'variable'])

export const RuleValueSchema = z.object({
  mode: RuleValueModeSchema,
  value: z.string(),
})

export const LogicOperatorSchema = z.enum(['AND', 'OR'])

// Recursive type for LogicGroup
export const LogicRuleSchema = z.object({
  id: z.string(),
  type: z.literal('rule'),
  variableId: z.string(),
  operator: RuleOperatorSchema,
  value: RuleValueSchema,
})

// Define LogicGroup recursively using z.lazy
export type LogicGroupType = {
  id: string
  type: 'group'
  logic: 'AND' | 'OR'
  children: (z.infer<typeof LogicRuleSchema> | LogicGroupType)[]
}

export const LogicGroupSchema: z.ZodType<LogicGroupType> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.literal('group'),
    logic: LogicOperatorSchema,
    children: z.array(z.union([LogicRuleSchema, LogicGroupSchema])),
  })
)

// =============================================================================
// ProseMirror Document Schema
// =============================================================================

export const ProseMirrorMarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional(),
})

// Recursive ProseMirror node schema
export type ProseMirrorNodeType = {
  type: string
  attrs?: Record<string, unknown>
  content?: ProseMirrorNodeType[]
  marks?: z.infer<typeof ProseMirrorMarkSchema>[]
  text?: string
}

export const ProseMirrorNodeSchema: z.ZodType<ProseMirrorNodeType> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(ProseMirrorNodeSchema).optional(),
    marks: z.array(ProseMirrorMarkSchema).optional(),
    text: z.string().optional(),
  })
)

export const ProseMirrorDocumentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(ProseMirrorNodeSchema),
})

// =============================================================================
// Export Info Schema
// =============================================================================

export const ExportInfoSchema = z.object({
  exportedAt: z.string().datetime({ message: 'Fecha de exportación inválida' }),
  exportedBy: z.string().optional(),
  sourceApp: z.string(),
  checksum: z.string().optional(),
})

// =============================================================================
// Complete Portable Document Schema
// =============================================================================

export const PortableDocumentSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Versión debe ser formato semántico (x.y.z)'),
  meta: DocumentMetaSchema,
  pageConfig: PageConfigSchema,
  variableIds: z.array(VariableIdSchema).nullable().transform((v) => v ?? []),
  content: ProseMirrorDocumentSchema,
  exportInfo: ExportInfoSchema,
})

// =============================================================================
// Type inference helpers
// =============================================================================

export type DocumentMetaInput = z.input<typeof DocumentMetaSchema>
export type PageConfigInput = z.input<typeof PageConfigSchema>
export type BackendVariableInput = z.input<typeof BackendVariableSchema>
export type PortableDocumentInput = z.input<typeof PortableDocumentSchema>

// =============================================================================
// Validation helpers
// =============================================================================

/**
 * Validates a portable document and returns typed result
 */
export function validateDocument(data: unknown) {
  return PortableDocumentSchema.safeParse(data)
}

/**
 * Validates document content (ProseMirror structure)
 */
export function validateContent(data: unknown) {
  return ProseMirrorDocumentSchema.safeParse(data)
}

/**
 * Checks if document version is compatible
 */
export function isVersionCompatible(version: string): boolean {
  const [major] = version.split('.').map(Number)
  const [currentMajor] = DOCUMENT_FORMAT_VERSION.split('.').map(Number)
  return major === currentMajor
}

/**
 * Compares two semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if ((partsA[i] ?? 0) < (partsB[i] ?? 0)) return -1
    if ((partsA[i] ?? 0) > (partsB[i] ?? 0)) return 1
  }

  return 0
}
