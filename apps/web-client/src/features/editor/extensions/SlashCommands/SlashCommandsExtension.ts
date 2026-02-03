import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import i18n from '@/lib/i18n'
import { filterCommands, type SlashCommand } from './commands'

const SlashCommandsPluginKey = new PluginKey('slashCommands')

export interface SlashCommandsOptions {
  suggestion: Partial<SuggestionOptions<SlashCommand>>
}

export const SlashCommandsExtension = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor
          range: { from: number; to: number }
          props: SlashCommand
        }) => {
          // Eliminar '/' primero para que el rango sea válido incluso si la acción modifica la estructura
          editor.chain().focus().deleteRange(range).run()
          props.action(editor)
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: SlashCommandsPluginKey,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => filterCommands(query, i18n.t.bind(i18n)),
        char: '/',
        allowSpaces: true,
        allowedPrefixes: null,
      }),
    ]
  },
})
