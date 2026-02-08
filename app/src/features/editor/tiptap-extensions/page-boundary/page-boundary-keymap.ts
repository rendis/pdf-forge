import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { findParentPage, isAtPageStart } from '../utils'

const pluginKey = new PluginKey('pageBoundaryKeymap')

/**
 * Extensión que maneja el comportamiento de teclado en límites de página.
 *
 * Usa handleDOMEvents.keydown que tiene prioridad más alta que handleKeyDown
 * de los plugins de ProseMirror, asegurando que interceptemos Backspace antes
 * que otros handlers.
 */
export const PageBoundaryKeymap = Extension.create({
  name: 'PageBoundaryKeymap',

  // Prioridad máxima
  priority: 1000,

  addOptions() {
    return {
      debug: false,
    }
  },

  addProseMirrorPlugins() {
    const debug = this.options.debug

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            keydown: (view, event) => {
              // Solo interceptar Backspace
              if (event.key !== 'Backspace') return false

              const { state } = view
              const { selection, doc } = state
              const { empty } = selection

              if (debug) console.log('[PageBoundaryKeymap] Backspace intercepted via handleDOMEvents')

              // Solo actuar si no hay selección de texto
              if (!empty) {
                if (debug) console.log('[PageBoundaryKeymap] EXIT: has selection')
                return false
              }

              // Verificar si hay más de una página
              if (doc.childCount <= 1) {
                if (debug) console.log('[PageBoundaryKeymap] EXIT: only 1 page')
                return false
              }

              // Encontrar página actual
              const pageInfo = findParentPage(selection)
              if (!pageInfo) {
                if (debug) console.log('[PageBoundaryKeymap] EXIT: no pageInfo')
                return false
              }

              // Verificar si estamos al inicio de la página
              const atStart = isAtPageStart(selection, pageInfo.start)
              if (debug) {
                console.log('[PageBoundaryKeymap] Position check:', {
                  pagePos: pageInfo.pos,
                  pageStart: pageInfo.start,
                  cursorPos: selection.$anchor.pos,
                  atStart,
                })
              }
              if (!atStart) {
                if (debug) console.log('[PageBoundaryKeymap] EXIT: not at page start')
                return false
              }

              // Encontrar página anterior usando iteración
              let pageIndex = -1
              let prevPagePos = 0
              let currentPos = 0

              for (let i = 0; i < doc.childCount; i++) {
                const child = doc.child(i)
                if (currentPos === pageInfo.pos) {
                  pageIndex = i
                  break
                }
                prevPagePos = currentPos
                currentPos += child.nodeSize
              }

              if (debug) console.log('[PageBoundaryKeymap] Page iteration:', { pageIndex, prevPagePos })
              if (pageIndex <= 0) {
                if (debug) console.log('[PageBoundaryKeymap] EXIT: pageIndex <= 0 (first page)')
                return false
              }

              const prevPage = doc.child(pageIndex - 1)

              // Obtener último párrafo de página anterior y primer párrafo de actual
              const lastChild = prevPage.lastChild
              const firstChild = pageInfo.node.firstChild

              if (debug) {
                console.log('[PageBoundaryKeymap] Children:', {
                  lastChildType: lastChild?.type.name,
                  firstChildType: firstChild?.type.name,
                  lastChildText: lastChild?.textContent?.slice(-30),
                  firstChildText: firstChild?.textContent?.slice(0, 30),
                })
              }

              if (!lastChild || !firstChild) {
                if (debug) console.log('[PageBoundaryKeymap] EXIT: missing children')
                return false
              }

              // Calcular posiciones
              const prevPageStart = prevPagePos + 1
              const prevPageContentEnd = prevPageStart + prevPage.content.size
              const currPageFirstChildStart = pageInfo.start
              const currPageFirstChildEnd = currPageFirstChildStart + firstChild.nodeSize

              // Crear transacción para merge
              const tr = state.tr

              // Si ambos son del mismo tipo (ej: paragraph), unir contenido
              if (lastChild.type === firstChild.type) {
                const insertPos = prevPageContentEnd - 1
                const textToMerge = firstChild.textContent

                if (debug) {
                  console.log('[PageBoundaryKeymap] MERGING same type:', {
                    insertPos,
                    textToMerge: textToMerge?.slice(0, 40),
                    deleteFrom: currPageFirstChildStart,
                    deleteTo: currPageFirstChildEnd,
                  })
                }

                // Eliminar primer párrafo de página actual
                tr.delete(currPageFirstChildStart, currPageFirstChildEnd)

                // Insertar texto al final del último párrafo de página anterior
                if (textToMerge) {
                  tr.insertText(textToMerge, insertPos)
                }

                // Mover cursor al punto de unión
                tr.setSelection(TextSelection.create(tr.doc, insertPos))

                if (debug) console.log('[PageBoundaryKeymap] Dispatching merge transaction')
                view.dispatch(tr)

                // Prevenir el comportamiento por defecto
                event.preventDefault()
                return true
              }

              // Si el primer hijo está vacío, simplemente eliminarlo
              if (!firstChild.textContent) {
                if (debug) console.log('[PageBoundaryKeymap] Deleting empty first child')

                tr.delete(currPageFirstChildStart, currPageFirstChildEnd)
                tr.setSelection(TextSelection.create(tr.doc, prevPageContentEnd - 1))
                view.dispatch(tr)

                event.preventDefault()
                return true
              }

              // Si tipos diferentes y con contenido, dejar que otros handlers manejen
              if (debug) console.log('[PageBoundaryKeymap] EXIT: different types with content')
              return false
            },
          },
        },
      }),
    ]
  },
})
