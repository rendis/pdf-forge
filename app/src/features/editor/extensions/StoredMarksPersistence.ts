import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { Mark } from '@tiptap/pm/model'

const pluginKey = new PluginKey('storedMarksPersistence')

interface PersistedMarksState {
  marks: Map<number, readonly Mark[]>
}

/**
 * Returns the content-start position of the empty paragraph the cursor is in,
 * or null if the cursor is not inside an empty paragraph.
 */
function getEmptyParagraphPos(state: EditorState): number | null {
  const { selection } = state
  if (!selection.empty) return null

  const $from = selection.$from
  const parent = $from.parent

  if (parent.type.name !== 'paragraph' || parent.content.size !== 0) {
    return null
  }

  return $from.start($from.depth)
}

/**
 * Merge saved marks with current marks. For marks of the same type (e.g. textStyle),
 * combines attributes — current values take priority, saved values fill gaps.
 * For different mark types, adds saved marks that are missing from current.
 */
function mergeMarks(
  saved: readonly Mark[],
  current: readonly Mark[],
): Mark[] {
  const result = [...current]

  for (const savedMark of saved) {
    const existingIdx = result.findIndex((m) => m.type === savedMark.type)
    if (existingIdx >= 0) {
      // Same mark type — merge attributes (current wins for non-null values)
      const existing = result[existingIdx]
      const mergedAttrs: Record<string, unknown> = {}

      // Start with saved attrs (non-null)
      for (const [key, value] of Object.entries(savedMark.attrs)) {
        if (value !== null && value !== undefined) {
          mergedAttrs[key] = value
        }
      }

      // Override with current attrs (non-null)
      for (const [key, value] of Object.entries(existing.attrs)) {
        if (value !== null && value !== undefined) {
          mergedAttrs[key] = value
        }
      }

      result[existingIdx] = savedMark.type.create(mergedAttrs)
    } else {
      // Mark type not in current — add it
      result.push(savedMark)
    }
  }

  return result
}

/**
 * TipTap extension that persists storedMarks on empty paragraphs.
 *
 * Problem: ProseMirror clears storedMarks when the cursor moves or the editor
 * loses focus. On empty paragraphs (no text to anchor marks), formatting set
 * via the toolbar is lost when the user navigates away and returns.
 *
 * Solution: A ProseMirror plugin that saves storedMarks for empty paragraphs
 * and restores (or merges) them when the cursor returns.
 */
export const StoredMarksPersistenceExtension = Extension.create({
  name: 'storedMarksPersistence',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,

        state: {
          init(): PersistedMarksState {
            return { marks: new Map() }
          },

          apply(
            tr: Transaction,
            value: PersistedMarksState,
            oldState: EditorState,
            newState: EditorState,
          ): PersistedMarksState {
            // Skip our own restoration transactions
            if (tr.getMeta(pluginKey)) {
              return value
            }

            const newMap = new Map<number, readonly Mark[]>()

            // Step 1: Map existing positions through doc changes
            // Use assoc=-1 (left bias) so positions stay with the ORIGINAL
            // paragraph when a split occurs (Enter on empty line), rather than
            // jumping to the newly created paragraph.
            if (tr.docChanged) {
              for (const [oldPos, marks] of value.marks) {
                const newPos = tr.mapping.map(oldPos, -1)
                if (newPos > 0 && newPos < newState.doc.content.size) {
                  try {
                    const $pos = newState.doc.resolve(newPos)
                    const parent = $pos.parent
                    if (
                      parent.type.name === 'paragraph' &&
                      parent.content.size === 0
                    ) {
                      newMap.set($pos.start($pos.depth), marks)
                    }
                  } catch {
                    // Position invalid after mapping — discard
                  }
                }
              }
            } else {
              // No doc change — copy as-is
              for (const [pos, marks] of value.marks) {
                newMap.set(pos, marks)
              }
            }

            // Step 2: Save marks on blur (triggered by view() handler)
            if (tr.getMeta('saveStoredMarks')) {
              const emptyParaPos = getEmptyParagraphPos(oldState)
              if (
                emptyParaPos !== null &&
                oldState.storedMarks &&
                oldState.storedMarks.length > 0
              ) {
                newMap.set(emptyParaPos, oldState.storedMarks)
              }
              return { marks: newMap }
            }

            // Step 3: Detect cursor leaving an empty paragraph with storedMarks
            const oldEmptyPos = getEmptyParagraphPos(oldState)
            const newEmptyPos = getEmptyParagraphPos(newState)

            if (oldEmptyPos !== null && oldEmptyPos !== newEmptyPos) {
              const oldStoredMarks = oldState.storedMarks
              if (oldStoredMarks && oldStoredMarks.length > 0) {
                const mappedPos = tr.docChanged
                  ? tr.mapping.map(oldEmptyPos, -1)
                  : oldEmptyPos

                if (mappedPos > 0 && mappedPos < newState.doc.content.size) {
                  try {
                    const $pos = newState.doc.resolve(mappedPos)
                    if (
                      $pos.parent.type.name === 'paragraph' &&
                      $pos.parent.content.size === 0
                    ) {
                      newMap.set($pos.start($pos.depth), oldStoredMarks)
                    }
                  } catch {
                    // Position invalid — discard
                  }
                }
              }
            }

            // Step 4: Update saved marks when user sets new marks on current empty paragraph
            if (
              newEmptyPos !== null &&
              newState.storedMarks &&
              newState.storedMarks.length > 0
            ) {
              newMap.set(newEmptyPos, newState.storedMarks)
            }

            return { marks: newMap }
          },
        },

        appendTransaction(
          transactions: readonly Transaction[],
          _oldState: EditorState,
          newState: EditorState,
        ) {
          // Skip our own transactions
          if (transactions.some((tr) => tr.getMeta(pluginKey))) {
            return null
          }

          // Only act when selection or doc changed
          if (!transactions.some((tr) => tr.selectionSet || tr.docChanged)) {
            return null
          }

          const emptyParaPos = getEmptyParagraphPos(newState)
          if (emptyParaPos === null) return null

          const pluginState = pluginKey.getState(
            newState,
          ) as PersistedMarksState | undefined
          if (!pluginState) return null

          const savedMarks = pluginState.marks.get(emptyParaPos)
          if (!savedMarks || savedMarks.length === 0) return null

          const currentMarks = newState.storedMarks

          if (currentMarks === null) {
            // No current marks — restore all saved
            return newState.tr
              .setStoredMarks([...savedMarks])
              .setMeta(pluginKey, true)
          }

          // Current marks exist — merge (current wins, saved fills gaps)
          const merged = mergeMarks(savedMarks, currentMarks)

          // Only dispatch if merge actually added something
          if (merged.length > currentMarks.length) {
            return newState.tr
              .setStoredMarks(merged)
              .setMeta(pluginKey, true)
          }

          // Check if merged attrs differ from current (e.g. fontFamily restored)
          const mergedJSON = JSON.stringify(merged.map((m) => m.toJSON()))
          const currentJSON = JSON.stringify(currentMarks.map((m) => m.toJSON()))
          if (mergedJSON !== currentJSON) {
            return newState.tr
              .setStoredMarks(merged)
              .setMeta(pluginKey, true)
          }

          return null
        },

        view() {
          let editorView: EditorView | null = null

          const handleBlur = () => {
            if (!editorView) return
            const state = editorView.state
            if (
              state.storedMarks &&
              state.storedMarks.length > 0 &&
              getEmptyParagraphPos(state) !== null
            ) {
              const tr = state.tr.setMeta('saveStoredMarks', true)
              editorView.dispatch(tr)
            }
          }

          return {
            update(view: EditorView) {
              if (editorView !== view) {
                // Remove old listener if view changed
                if (editorView) {
                  editorView.dom.removeEventListener('blur', handleBlur, true)
                }
                editorView = view
                view.dom.addEventListener('blur', handleBlur, true)
              }
            },
            destroy() {
              if (editorView) {
                editorView.dom.removeEventListener('blur', handleBlur, true)
              }
            },
          }
        },
      }),
    ]
  },
})
