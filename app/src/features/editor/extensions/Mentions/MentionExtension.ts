import Mention from '@tiptap/extension-mention'
import type { Editor } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { filterVariables, type MentionVariable } from './variables'
import { variableSuggestion } from './suggestion'
import {
  hasConfigurableOptions,
  getDefaultFormat,
} from '../../types/injectable'
import type { Variable } from '../../types/variables'

const MentionPluginKey = new PluginKey('mentionSuggestion')

export const MentionExtension = Mention.configure({
  suggestion: {
    char: '@',
    pluginKey: MentionPluginKey,
    allowSpaces: true,
    ...variableSuggestion,
    items: ({ query }: { query: string }) => filterVariables(query),
    command: ({
      editor,
      range,
      props,
    }: {
      editor: Editor
      range: { from: number; to: number }
      props: unknown
    }) => {
      const item = props as MentionVariable

      // Si es TABLE, insertar como tableInjector (block)
      if (item.type === 'TABLE') {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setTableInjector({
            variableId: item.id,
            label: item.label,
          })
          .run()
        return
      }

      // Check if variable has configurable options
      if (hasConfigurableOptions(item.formatConfig)) {
        // Convert to Variable format for the event
        const variable: Variable = {
          id: item.id,
          variableId: item.id,
          label: item.label,
          type: item.type,
          formatConfig: item.formatConfig,
          sourceType: item.sourceType || 'EXTERNAL',
        }

        // Emit event to open format selector
        editor.view.dom.dispatchEvent(
          new CustomEvent('editor:select-variable-format', {
            detail: { variable, range },
          })
        )
      } else {
        // Insert directly with default format
        const defaultFormat = getDefaultFormat(item.formatConfig)
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setInjector({
            type: item.type,
            label: item.label,
            variableId: item.id,
            format: defaultFormat || null,
          })
          .run()
      }
    },
  },
})
