import {
  BaseDialogContent,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import { Info, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SchedulePublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: TemplateVersionSummaryResponse | null
  onConfirm: (publishAt: string) => void
  isLoading?: boolean
}

function getMinDate(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function getMinTime(selectedDate: string): string {
  const today = getMinDate()
  if (selectedDate === today) {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toTimeString().slice(0, 5)
  }
  return '00:00'
}

export function SchedulePublishDialog({
  open,
  onOpenChange,
  version,
  onConfirm,
  isLoading,
}: SchedulePublishDialogProps) {
  const { t } = useTranslation()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      onOpenChange(isOpen)
    },
    [onOpenChange]
  )

  const handleSubmit = () => {
    if (!date || !time) return

    const publishAt = new Date(`${date}T${time}`).toISOString()
    onConfirm(publishAt)
    // Reset form after successful submission
    setDate('')
    setTime('')
  }

  const isValid = date && time

  if (!version) return null

  return (
    <Dialog key={version.id} open={open} onOpenChange={handleOpenChange}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('templates.scheduleDialog.title', 'Schedule Publication')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t('templates.scheduleDialog.description', 'Schedule when "{{name}}" will go live', {
                name: version.name,
              })}
            </DialogDescription>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Date field */}
          <div>
            <label
              htmlFor="publish-date"
              className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
            >
              {t('templates.scheduleDialog.dateLabel', 'Publish Date')}
            </label>
            <input
              id="publish-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={getMinDate()}
              className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all focus-visible:border-foreground focus-visible:ring-0 dark:scheme-dark"
            />
          </div>

          {/* Time field */}
          <div>
            <label
              htmlFor="publish-time"
              className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
            >
              {t('templates.scheduleDialog.timeLabel', 'Publish Time')}
            </label>
            <input
              id="publish-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              min={date ? getMinTime(date) : undefined}
              className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all focus-visible:border-foreground focus-visible:ring-0 dark:scheme-dark"
            />
          </div>

          {/* Info message */}
          <div className="flex gap-3 rounded-md border border-info-border bg-info-muted p-4">
            <Info className="h-5 w-5 shrink-0 text-info" />
            <p className="text-sm text-info-foreground">
              {t(
                'templates.scheduleDialog.info',
                'The version will be published automatically at the scheduled time. You can cancel anytime before then.'
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {isLoading
              ? t('common.scheduling', 'Scheduling...')
              : t('templates.scheduleDialog.confirm', 'Schedule')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
