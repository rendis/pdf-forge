import { Extension } from '@tiptap/core'
import {
  DEFAULT_LINE_SPACING,
  getLineSpacingCssValue,
  normalizeLineSpacingPreset,
  type LineSpacingPreset,
} from '../config/line-spacing'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineSpacing: {
      setLineSpacing: (lineSpacing: LineSpacingPreset) => ReturnType
      unsetLineSpacing: () => ReturnType
    }
  }
}

export interface LineSpacingOptions {
  types: string[]
  defaultPreset: LineSpacingPreset
}

function renderLineSpacingAttributes(lineSpacing?: string | null) {
  if (
    !lineSpacing ||
    normalizeLineSpacingPreset(lineSpacing) === DEFAULT_LINE_SPACING
  ) {
    return {}
  }

  return {
    'data-line-spacing': lineSpacing,
    style: `line-height: ${getLineSpacingCssValue(lineSpacing)}`,
  }
}

export const LineSpacingExtension = Extension.create<LineSpacingOptions>({
  name: 'lineSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultPreset: DEFAULT_LINE_SPACING,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineSpacing: {
            default: null,
            parseHTML: (element) => {
              const attr = element.getAttribute('data-line-spacing')
              if (!attr) return null

              const preset = normalizeLineSpacingPreset(attr)
              return preset === this.options.defaultPreset ? null : preset
            },
            renderHTML: (attributes) =>
              renderLineSpacingAttributes(attributes.lineSpacing),
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLineSpacing:
        (lineSpacing) =>
        ({ commands }) => {
          const preset = normalizeLineSpacingPreset(lineSpacing)

          if (preset === this.options.defaultPreset) {
            return this.options.types
              .map((type) => commands.resetAttributes(type, 'lineSpacing'))
              .some((response) => response)
          }

          return this.options.types
            .map((type) =>
              commands.updateAttributes(type, { lineSpacing: preset }),
            )
            .some((response) => response)
        },

      unsetLineSpacing:
        () =>
        ({ commands }) =>
          this.options.types
            .map((type) => commands.resetAttributes(type, 'lineSpacing'))
            .some((response) => response),
    }
  },
})
