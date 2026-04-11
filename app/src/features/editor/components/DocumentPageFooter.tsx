import { type Editor } from '@tiptap/core'
import { DocumentPageSurface, FOOTER_DROP_ZONE_ID } from './DocumentPageSurface'

export { FOOTER_DROP_ZONE_ID }

interface DocumentPageFooterProps {
  editable: boolean
  active?: boolean
  onActivate?: () => void
  onTextEditorFocus?: (editor: Editor) => void
  onEditorReady?: (editor: Editor | null) => void
  openImageModalToken?: number
  paddingLeft?: number
  paddingRight?: number
}

export function DocumentPageFooter(props: DocumentPageFooterProps) {
  return <DocumentPageSurface kind="footer" {...props} />
}
