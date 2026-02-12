import { Table } from '@tiptap/extension-table'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'
import type { TableStylesAttrs } from './types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableStyles: {
      /**
       * Set table styles
       */
      setTableStyles: (styles: Partial<TableStylesAttrs>) => ReturnType
    }
  }
}

const colwidthSyncKey = new PluginKey('colwidthSync')

export const TableExtension = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Header styles
      headerFontFamily: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-font-family'),
        renderHTML: (attributes) => {
          if (!attributes.headerFontFamily) return {}
          return { 'data-header-font-family': attributes.headerFontFamily }
        },
      },
      headerFontSize: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-header-font-size')
          return val ? parseInt(val, 10) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.headerFontSize) return {}
          return { 'data-header-font-size': attributes.headerFontSize }
        },
      },
      headerFontWeight: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-font-weight'),
        renderHTML: (attributes) => {
          if (!attributes.headerFontWeight) return {}
          return { 'data-header-font-weight': attributes.headerFontWeight }
        },
      },
      headerTextColor: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-text-color'),
        renderHTML: (attributes) => {
          if (!attributes.headerTextColor) return {}
          return { 'data-header-text-color': attributes.headerTextColor }
        },
      },
      headerTextAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-text-align'),
        renderHTML: (attributes) => {
          if (!attributes.headerTextAlign) return {}
          return { 'data-header-text-align': attributes.headerTextAlign }
        },
      },
      headerBackground: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-header-background'),
        renderHTML: (attributes) => {
          if (!attributes.headerBackground) return {}
          return { 'data-header-background': attributes.headerBackground }
        },
      },
      // Body styles
      bodyFontFamily: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-body-font-family'),
        renderHTML: (attributes) => {
          if (!attributes.bodyFontFamily) return {}
          return { 'data-body-font-family': attributes.bodyFontFamily }
        },
      },
      bodyFontSize: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-body-font-size')
          return val ? parseInt(val, 10) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.bodyFontSize) return {}
          return { 'data-body-font-size': attributes.bodyFontSize }
        },
      },
      bodyFontWeight: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-body-font-weight'),
        renderHTML: (attributes) => {
          if (!attributes.bodyFontWeight) return {}
          return { 'data-body-font-weight': attributes.bodyFontWeight }
        },
      },
      bodyTextColor: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-body-text-color'),
        renderHTML: (attributes) => {
          if (!attributes.bodyTextColor) return {}
          return { 'data-body-text-color': attributes.bodyTextColor }
        },
      },
      bodyTextAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-body-text-align'),
        renderHTML: (attributes) => {
          if (!attributes.bodyTextAlign) return {}
          return { 'data-body-text-align': attributes.bodyTextAlign }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTableStyles:
        (styles: Partial<TableStylesAttrs>) =>
        ({ commands }) => {
          return commands.updateAttributes('table', styles)
        },
    }
  },

  addProseMirrorPlugins() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cellMinWidth = (this.options as any).cellMinWidth ?? 25

    return [
      ...(this.parent?.() || []),
      new Plugin({
        key: colwidthSyncKey,

        // ---------------------------------------------------------------
        // Part 1 & 2: View plugin — init colwidths + MutationObserver
        // ---------------------------------------------------------------
        view() {
          const observers: MutationObserver[] = []

          /** Collect per-column widths from a table node's first row */
          function collectColWidths(tableNode: PmNode): (number | null)[] {
            const firstRow = tableNode.firstChild
            if (!firstRow) return []
            const widths: (number | null)[] = []
            firstRow.forEach((cell) => {
              const cw = cell.attrs.colwidth
              const colspan = cell.attrs.colspan || 1
              if (cw && Array.isArray(cw) && cw.length === colspan) {
                for (const w of cw) widths.push(w as number)
              } else {
                for (let i = 0; i < colspan; i++) widths.push(null)
              }
            })
            return widths
          }

          /** Measure actual cell widths from the DOM first row */
          function measureDomWidths(tableEl: HTMLTableElement): number[] {
            const firstRowEl = tableEl.querySelector('tr')
            if (!firstRowEl) return []
            const cellEls = Array.from(firstRowEl.children) as HTMLTableCellElement[]
            const widths: number[] = []
            for (const cellEl of cellEls) {
              const colspan = cellEl.colSpan || 1
              const w = cellEl.getBoundingClientRect().width
              const perCol = w / colspan
              for (let c = 0; c < colspan; c++) widths.push(Math.round(perCol))
            }
            return widths
          }

          /** Find the <table> element from a ProseMirror nodeDOM result */
          function findTableEl(dom: HTMLElement | null): HTMLTableElement | null {
            if (!dom) return null
            if (dom.tagName === 'TABLE') return dom as HTMLTableElement
            return dom.querySelector?.('table') ?? null
          }

          function disconnectAll() {
            for (const obs of observers) obs.disconnect()
            observers.length = 0
          }

          /** Setup MutationObserver for a table's colgroup (Part 2) */
          function setupObserver(
            tableNode: PmNode,
            tableEl: HTMLTableElement,
          ) {
            const colgroup = tableEl.querySelector('colgroup')
            if (!colgroup) return

            const observer = new MutationObserver(() => {
              observer.disconnect()

              try {
                // Read base widths from state (all explicit after Part 1)
                const stateWidths = collectColWidths(tableNode)
                if (stateWidths.some(w => w === null)) {
                  reconnect()
                  return
                }
                const baseWidths = stateWidths as number[]

                // Read current <col> widths from DOM colgroup
                const cols = Array.from(colgroup.children) as HTMLElement[]
                const colWidths: number[] = []
                for (const col of cols) {
                  const w = parseFloat(col.style.width)
                  colWidths.push(isNaN(w) ? 0 : w)
                }

                if (colWidths.length !== baseWidths.length) {
                  reconnect()
                  return
                }

                // Find which column prosemirror-tables overrode
                let overrideCol = -1
                for (let i = 0; i < colWidths.length; i++) {
                  if (Math.abs(colWidths[i] - baseWidths[i]) > 0.5) {
                    overrideCol = i
                    break
                  }
                }

                if (overrideCol === -1) {
                  reconnect()
                  return
                }

                // Adjust adjacent column to compensate, cap override to prevent expansion
                const diff = colWidths[overrideCol] - baseWidths[overrideCol]
                const adjCol = overrideCol + 1
                if (adjCol < baseWidths.length) {
                  const adjWidth = Math.max(cellMinWidth, baseWidths[adjCol] - diff)
                  const actualShrink = baseWidths[adjCol] - adjWidth
                  const cappedOverride = baseWidths[overrideCol] + actualShrink
                  cols[overrideCol].style.width = cappedOverride + 'px'
                  cols[adjCol].style.width = adjWidth + 'px'
                }

                // Fix all other columns to their base widths
                for (let i = 0; i < cols.length; i++) {
                  if (i !== overrideCol && i !== adjCol) {
                    cols[i].style.width = baseWidths[i] + 'px'
                  }
                }

                // Maintain total table width
                const totalWidth = baseWidths.reduce((a, b) => a + b, 0)
                tableEl.style.width = totalWidth + 'px'
              } catch {
                // Ignore errors during drag (DOM may be stale)
              }

              reconnect()
            })

            function reconnect() {
              observer.observe(colgroup, {
                attributes: true,
                attributeFilter: ['style'],
                subtree: true,
              })
            }

            reconnect()
            observers.push(observer)
          }

          return {
            update(view: EditorView) {
              // Always rebuild observers with fresh node references
              disconnectAll()

              const { state } = view
              const { doc } = state

              // Phase 1: Collect tables needing colwidth init
              const inits: Array<{ node: PmNode; pos: number; widths: number[] }> = []

              doc.descendants((node, pos) => {
                if (node.type.name !== 'table') return true
                const colWidths = collectColWidths(node)
                if (colWidths.some(w => w === null)) {
                  const dom = view.nodeDOM(pos) as HTMLElement | null
                  const tableEl = findTableEl(dom)
                  if (!tableEl) return false
                  const domWidths = measureDomWidths(tableEl)
                  if (domWidths.length !== colWidths.length) return false
                  const resolved = colWidths.map((w, i) => w ?? domWidths[i]) as number[]
                  inits.push({ node, pos, widths: resolved })
                }
                return false
              })

              // If any tables need init, dispatch and return (next update sets up observers)
              if (inits.length > 0) {
                const tr = state.tr
                let changed = false
                for (const { node, pos, widths } of inits) {
                  node.forEach((row, rowOffset) => {
                    const rowPos = pos + 1 + rowOffset
                    let colIdx = 0
                    row.forEach((cell, cellOffset) => {
                      const cellPos = rowPos + 1 + cellOffset
                      const colspan = cell.attrs.colspan || 1
                      const newCw = widths.slice(colIdx, colIdx + colspan)
                      const oldCw = cell.attrs.colwidth
                      const needsUpdate =
                        !oldCw ||
                        !Array.isArray(oldCw) ||
                        oldCw.length !== newCw.length ||
                        oldCw.some((v: number, i: number) => v !== newCw[i])
                      if (needsUpdate) {
                        tr.setNodeMarkup(cellPos, undefined, {
                          ...cell.attrs,
                          colwidth: newCw,
                        })
                        changed = true
                      }
                      colIdx += colspan
                    })
                  })
                }
                if (changed) {
                  tr.setMeta(colwidthSyncKey, true)
                  view.dispatch(tr)
                }
                return
              }

              // Phase 2: All colwidths explicit — set up MutationObservers
              doc.descendants((node, pos) => {
                if (node.type.name !== 'table') return true
                const dom = view.nodeDOM(pos) as HTMLElement | null
                const tableEl = findTableEl(dom)
                if (tableEl) {
                  setupObserver(node, tableEl)
                }
                return false
              })
            },

            destroy() {
              disconnectAll()
            },
          }
        },

        // ---------------------------------------------------------------
        // Part 3: Simplified appendTransaction (all colwidths explicit)
        // ---------------------------------------------------------------
        appendTransaction(transactions, oldState, newState) {
          if (transactions.some(tr => tr.getMeta(colwidthSyncKey))) return null
          if (!transactions.some(tr => tr.docChanged)) return null

          const tr = newState.tr
          let changed = false

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'table') return true

            const firstRow = node.firstChild
            if (!firstRow) return false

            // Collect new colwidths (should all be explicit after Part 1)
            const newColWidths: (number | null)[] = []
            firstRow.forEach((cell) => {
              const cw = cell.attrs.colwidth
              const colspan = cell.attrs.colspan || 1
              if (cw && Array.isArray(cw) && cw.length === colspan) {
                for (const w of cw) newColWidths.push(w as number)
              } else {
                for (let i = 0; i < colspan; i++) newColWidths.push(null)
              }
            })

            // Skip if not all colwidths are set yet (Part 1 will handle)
            if (newColWidths.some(w => w === null)) return false

            // Guard: pos might exceed old doc bounds (e.g. during setContent/import)
            if (pos >= oldState.doc.content.size) return false
            const oldNode = oldState.doc.nodeAt(pos)
            if (!oldNode || oldNode.type.name !== 'table') return false
            const oldFirstRow = oldNode.firstChild
            if (!oldFirstRow) return false

            const oldColWidths: (number | null)[] = []
            oldFirstRow.forEach((cell) => {
              const cw = cell.attrs.colwidth
              const colspan = cell.attrs.colspan || 1
              if (cw && Array.isArray(cw) && cw.length === colspan) {
                for (const w of cw) oldColWidths.push(w as number)
              } else {
                for (let i = 0; i < colspan; i++) oldColWidths.push(null)
              }
            })

            // Skip if old widths have nulls (Part 1 will init first)
            if (oldColWidths.some(w => w === null)) return false
            if (oldColWidths.length !== newColWidths.length) return false

            // Find which column changed
            let changedCol = -1
            for (let i = 0; i < newColWidths.length; i++) {
              if (newColWidths[i] !== oldColWidths[i]) {
                changedCol = i
                break
              }
            }
            if (changedCol === -1) return false

            const baseWidths = oldColWidths as number[]
            const newWidth = newColWidths[changedCol]!
            const diff = newWidth - baseWidths[changedCol]
            const adjCol = changedCol + 1

            // Cap override so adj never goes below cellMinWidth
            const adjBase = adjCol < baseWidths.length ? baseWidths[adjCol] : 0
            const adjWidth = Math.max(cellMinWidth, adjBase - diff)
            const actualShrink = adjBase - adjWidth
            const cappedWidth = baseWidths[changedCol] + actualShrink

            const finalWidths = baseWidths.map((oldW, i) => {
              if (i === changedCol) return cappedWidth
              if (i === adjCol && adjCol < newColWidths.length) return adjWidth
              return oldW
            })

            const roundedWidths = finalWidths.map(w => Math.round(w))

            // Update all cells in all rows
            node.forEach((row, rowOffset) => {
              const rowPos = pos + 1 + rowOffset
              let colIdx = 0
              row.forEach((cell, cellOffset) => {
                const cellPos = rowPos + 1 + cellOffset
                const colspan = cell.attrs.colspan || 1
                const newCw = roundedWidths.slice(colIdx, colIdx + colspan)
                const oldCw = cell.attrs.colwidth
                const needsUpdate =
                  !oldCw ||
                  !Array.isArray(oldCw) ||
                  oldCw.length !== newCw.length ||
                  oldCw.some((v: number, i: number) => v !== newCw[i])
                if (needsUpdate) {
                  tr.setNodeMarkup(cellPos, undefined, {
                    ...cell.attrs,
                    colwidth: newCw,
                  })
                  changed = true
                }
                colIdx += colspan
              })
            })

            return false
          })

          if (!changed) return null
          tr.setMeta(colwidthSyncKey, true)
          return tr
        },
      }),
    ]
  },
})
