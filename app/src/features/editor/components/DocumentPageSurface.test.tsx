import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useDocumentFooterStore } from '../stores/document-footer-store'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { DocumentPageSurface } from './DocumentPageSurface'

const mockSurfaceEditor = vi.hoisted(() => {
  const dom = document.createElement('div')
  return {
    state: { selection: { from: 1 } },
    view: { dom },
    commands: {
      setContent: vi.fn(),
      focus: vi.fn(),
    },
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({ run: vi.fn() })),
    })),
    isFocused: false,
    setEditable: vi.fn(),
    getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph' }] })),
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tiptap/react', () => ({
  useEditor: () => mockSurfaceEditor,
  EditorContent: () => <div data-testid="surface-editor" />,
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

vi.mock('@tiptap/core', () => ({
  Extension: { create: () => ({}) },
}))

vi.mock('react-moveable', () => ({
  default: () => null,
}))

vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: () => undefined,
    isOver: false,
  }),
}))

vi.mock('./ImageInsertModal', () => ({
  ImageInsertModal: () => null,
}))

vi.mock('./DocumentPageSurfaceLayout', () => ({
  SurfaceLayoutPicker: () => null,
  DocumentPageSurfaceLayout: ({ textSlot }: { textSlot: ReactNode }) => (
    <div data-testid="surface-layout">{textSlot}</div>
  ),
}))

vi.mock('../extensions/StoredMarksPersistence', () => ({
  StoredMarksPersistenceExtension: {},
}))

vi.mock('../extensions/LineSpacing', () => ({
  LineSpacingExtension: {},
}))

vi.mock('../extensions/Injector', () => ({
  InjectorExtension: {},
}))

describe('DocumentPageSurface', () => {
  beforeEach(() => {
    useDocumentHeaderStore.getState().reset()
    useDocumentFooterStore.getState().reset()
    vi.clearAllMocks()
  })

  it('does not replay ready notification when only the callback identity changes', () => {
    const firstReady = vi.fn()
    const secondReady = vi.fn()

    const { rerender, unmount } = render(
      <DocumentPageSurface kind="header" editable onEditorReady={firstReady} />
    )

    expect(firstReady).toHaveBeenCalledTimes(1)
    expect(firstReady).toHaveBeenCalledWith(mockSurfaceEditor)

    rerender(
      <DocumentPageSurface kind="header" editable onEditorReady={secondReady} />
    )

    expect(firstReady).toHaveBeenCalledTimes(1)
    expect(secondReady).not.toHaveBeenCalled()

    unmount()

    expect(secondReady).toHaveBeenCalledTimes(1)
    expect(secondReady).toHaveBeenCalledWith(null)
  })
})
