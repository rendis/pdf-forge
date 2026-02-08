import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import type { Editor } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InjectablesFormModal } from './InjectablesFormModal'
import { extractVariableIdsFromEditor } from '../../services/document-export'

interface PreviewButtonProps {
  templateId: string
  versionId: string
  disabled?: boolean
  editor: Editor | null
}

export function PreviewButton({
  templateId,
  versionId,
  disabled,
  editor,
}: PreviewButtonProps) {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [usedVariableIds, setUsedVariableIds] = useState<string[]>([])

  const handleClick = useCallback(() => {
    if (!disabled && templateId && versionId) {
      // Extract variable IDs from current editor content
      if (editor) {
        const ids = extractVariableIdsFromEditor(editor)
        setUsedVariableIds(ids)
      }
      setIsModalOpen(true)
    }
  }, [disabled, templateId, versionId, editor])

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClick}
            disabled={disabled || !templateId || !versionId}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('editor.preview.title')}</p>
        </TooltipContent>
      </Tooltip>

      <InjectablesFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        templateId={templateId}
        versionId={versionId}
        usedVariableIds={usedVariableIds}
      />
    </>
  )
}
