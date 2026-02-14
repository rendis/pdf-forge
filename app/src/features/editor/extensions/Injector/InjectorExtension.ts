// @ts-expect-error - TipTap types are not fully compatible with strict mode
import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { InjectorComponent } from './InjectorComponent'
import type { InjectorType } from '../../types/variables'

export interface InjectorOptions {
  type: InjectorType
  label: string
  variableId?: string
  /** Formato seleccionado para la variable (ej: "DD/MM/YYYY" para fechas) */
  format?: string | null
  /** Etiqueta antes del valor (ej: "Total: ") */
  prefix?: string | null
  /** Etiqueta después del valor (ej: " USD") */
  suffix?: string | null
  /** Mostrar etiquetas incluso si el valor está vacío */
  showLabelIfEmpty?: boolean
  /** Valor por defecto cuando el valor está vacío */
  defaultValue?: string | null
  /** Ancho fijo en píxeles (null = auto) */
  width?: number | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setInjector: (options: InjectorOptions) => ReturnType
  }
}

export const InjectorExtension = Node.create({
  name: 'injector',

  group: 'inline',

  inline: true,

  atom: true,

  allowGapCursor: false,

  addAttributes() {
    return {
      type: {
        default: 'TEXT',
      },
      label: {
        default: 'Variable',
      },
      variableId: {
        default: null,
      },
      format: {
        default: null,
      },
      required: {
        default: false,
      },
      prefix: {
        default: null,
      },
      suffix: {
        default: null,
      },
      showLabelIfEmpty: {
        default: false,
      },
      defaultValue: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const w = element.getAttribute('data-width')
          return w ? parseInt(w, 10) : null
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (attributes.width) {
            return { 'data-width': attributes.width }
          }
          return {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="injector"]',
      },
    ]
  },

  renderHTML({
    HTMLAttributes,
  }: {
    HTMLAttributes: Record<string, unknown>
  }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'injector' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InjectorComponent)
  },

  addCommands() {
    return {
      setInjector:
        (options: InjectorOptions) =>
        ({
          commands,
        }: {
          commands: { insertContent: (content: unknown) => boolean }
        }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
