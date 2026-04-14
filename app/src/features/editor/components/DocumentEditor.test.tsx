import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useDocumentFooterStore } from '../stores/document-footer-store'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { usePaginationStore } from '../stores/pagination-store'
import { DocumentEditor } from './DocumentEditor'

const headerReadyMetrics = vi.hoisted(() => ({ effects: 0 }))
const footerReadyMetrics = vi.hoisted(() => ({ effects: 0 }))

const bodyEditor = vi.hoisted(() => {
  const dom = document.createElement('div')
  return {
    id: 'body-editor',
    state: { selection: { from: 1 } },
    view: { dom },
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        updateAttributes: vi.fn(() => ({ run: vi.fn() })),
        setTextSelection: vi.fn(() => ({ run: vi.fn() })),
        setImage: vi.fn(() => ({ run: vi.fn() })),
        deleteRange: vi.fn(() => ({ run: vi.fn() })),
      })),
    })),
    on: vi.fn(),
    off: vi.fn(),
    getHTML: vi.fn(() => '<p>body</p>'),
  }
})

const headerEditor = vi.hoisted(() => ({ id: 'header-editor' }))
const footerEditor = vi.hoisted(() => ({ id: 'footer-editor' }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tiptap/react', () => ({
  useEditor: () => bodyEditor,
  EditorContent: () => <div data-testid="body-editor-content" />,
}))

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: () => ({}) },
}))

vi.mock('@tiptap/extension-text-style', () => ({
  TextStyle: {},
  FontFamily: { configure: () => ({}) },
  FontSize: { configure: () => ({}) },
}))

vi.mock('@tiptap/extension-color', () => ({
  Color: {},
}))

vi.mock('@tiptap/extension-text-align', () => ({
  default: { configure: () => ({}) },
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PointerSensor: function PointerSensor() { return null },
  useSensor: () => ({}),
  useSensors: () => ([]),
}))

vi.mock('./EditorToolbar', () => ({
  EditorToolbar: ({ editor, activeSurface }: { editor: { id?: string } | null; activeSurface?: string }) => (
    <div>
      <div data-testid="toolbar-editor">{editor?.id ?? 'none'}</div>
      <div data-testid="active-surface">{activeSurface ?? 'body'}</div>
    </div>
  ),
}))

vi.mock('./preview/PreviewButton', () => ({
  PreviewButton: () => <div data-testid="preview-button" />,
}))

vi.mock('./PageSettings', () => ({
  PageSettings: () => <div data-testid="page-settings" />,
}))

vi.mock('./VariablesPanel', () => ({
  VariablesPanel: () => <div data-testid="variables-panel" />,
}))

vi.mock('./VariableDragOverlay', () => ({
  VariableDragOverlay: () => null,
}))

vi.mock('./InconsistencyNavigator', () => ({
  InconsistencyNavigator: () => null,
}))

vi.mock('./TableBubbleMenu', () => ({
  TableBubbleMenu: () => null,
}))

vi.mock('./TableCornerHandle', () => ({
  TableCornerHandle: () => null,
}))

vi.mock('./ImageInsertModal', () => ({
  ImageInsertModal: () => null,
}))

vi.mock('./VariableFormatDialog', () => ({
  VariableFormatDialog: () => null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../hooks/useVariableInsertion', () => ({
  useVariableInsertion: () => ({
    activeDragData: null,
    dropCursorPos: null,
    formatDialogOpen: false,
    pendingVariable: null,
    handleDragEnd: vi.fn(),
    handleDragMove: vi.fn(),
    handleDragStart: vi.fn(),
    handleFormatCancel: vi.fn(),
    handleFormatSelect: vi.fn(),
    handleVariableClick: vi.fn(),
    openPendingVariableDialog: vi.fn(),
  }),
}))

vi.mock('../extensions/Injector', () => ({
  InjectorExtension: {},
}))

vi.mock('../extensions/Conditional', () => ({
  ConditionalExtension: {},
}))

vi.mock('../extensions/Mentions', () => ({
  MentionExtension: {},
}))

vi.mock('../extensions/Image', () => ({
  ImageExtension: {},
}))

vi.mock('../extensions/PageBreak', () => ({
  PageBreakHR: {},
}))

vi.mock('../extensions/SlashCommands', () => ({
  SlashCommandsExtension: { configure: () => ({}) },
  slashCommandsSuggestion: {},
}))

vi.mock('../extensions/Table', () => ({
  TableExtension: { configure: () => ({}) },
  TableRowExtension: {},
  TableHeaderExtension: {},
  TableCellExtension: {},
}))

vi.mock('../extensions/TableInjector', () => ({
  TableInjectorExtension: {},
}))

vi.mock('../extensions/ListInjector', () => ({
  ListInjectorExtension: {},
}))

vi.mock('../extensions/StoredMarksPersistence', () => ({
  StoredMarksPersistenceExtension: {},
}))

vi.mock('../extensions/LineSpacing', () => ({
  LineSpacingExtension: {},
}))

vi.mock('./DocumentPageHeader', async () => {
  const React = await import('react')

  return {
    HEADER_DROP_ZONE_ID: 'header-drop-zone',
    DocumentPageHeader: ({
      onEditorReady,
      onTextEditorFocus,
      onActivate,
    }: {
      onEditorReady?: (editor: typeof headerEditor | null) => void
      onTextEditorFocus?: (editor: typeof headerEditor) => void
      onActivate?: () => void
    }) => {
      React.useEffect(() => {
        headerReadyMetrics.effects += 1
        onEditorReady?.(headerEditor)
        return () => onEditorReady?.(null)
      }, [onEditorReady])

      return (
        <div data-testid="header-surface">
          <button type="button" onClick={() => onTextEditorFocus?.(headerEditor)}>
            focus-header
          </button>
          <button type="button" onClick={() => onActivate?.()}>
            activate-header
          </button>
        </div>
      )
    },
  }
})

vi.mock('./DocumentPageFooter', async () => {
  const React = await import('react')

  return {
    FOOTER_DROP_ZONE_ID: 'footer-drop-zone',
    DocumentPageFooter: ({
      onEditorReady,
      onTextEditorFocus,
      onActivate,
    }: {
      onEditorReady?: (editor: typeof footerEditor | null) => void
      onTextEditorFocus?: (editor: typeof footerEditor) => void
      onActivate?: () => void
    }) => {
      React.useEffect(() => {
        footerReadyMetrics.effects += 1
        onEditorReady?.(footerEditor)
        return () => onEditorReady?.(null)
      }, [onEditorReady])

      return (
        <div data-testid="footer-surface">
          <button type="button" onClick={() => onTextEditorFocus?.(footerEditor)}>
            focus-footer
          </button>
          <button type="button" onClick={() => onActivate?.()}>
            activate-footer
          </button>
        </div>
      )
    },
  }
})

describe('DocumentEditor', () => {
  beforeEach(() => {
    headerReadyMetrics.effects = 0
    footerReadyMetrics.effects = 0
    useDocumentHeaderStore.getState().reset()
    useDocumentFooterStore.getState().reset()
    usePaginationStore.getState().reset()
    vi.clearAllMocks()
  })

  it('stays stable when header and footer notify readiness through effect-driven callbacks', () => {
    render(<DocumentEditor editable />)

    expect(screen.getByTestId('toolbar-editor').textContent).toBe('body-editor')
    expect(headerReadyMetrics.effects).toBe(1)
    expect(footerReadyMetrics.effects).toBe(1)
  })

  it('switches the toolbar editor between body, header, and footer without recreating callback loops', () => {
    render(<DocumentEditor editable />)

    fireEvent.click(screen.getByText('focus-header'))
    expect(screen.getByTestId('active-surface').textContent).toBe('header')
    expect(screen.getByTestId('toolbar-editor').textContent).toBe('header-editor')

    fireEvent.click(screen.getByText('focus-footer'))
    expect(screen.getByTestId('active-surface').textContent).toBe('footer')
    expect(screen.getByTestId('toolbar-editor').textContent).toBe('footer-editor')

    fireEvent.mouseDown(screen.getByTestId('body-editor-content'))
    expect(screen.getByTestId('active-surface').textContent).toBe('body')
    expect(screen.getByTestId('toolbar-editor').textContent).toBe('body-editor')

    expect(headerReadyMetrics.effects).toBe(1)
    expect(footerReadyMetrics.effects).toBe(1)
  })
})
