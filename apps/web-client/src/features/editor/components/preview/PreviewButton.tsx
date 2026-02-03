import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InjectablesFormModal } from './InjectablesFormModal'

interface PreviewButtonProps {
  templateId: string
  versionId: string
  disabled?: boolean
}

export function PreviewButton({
  templateId,
  versionId,
  disabled,
}: PreviewButtonProps) {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleClick = () => {
    if (!disabled && templateId && versionId) {
      setIsModalOpen(true)
    }
  }

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
      />
    </>
  )
}
