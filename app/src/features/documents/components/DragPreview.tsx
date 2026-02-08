import { Folder, FileText } from 'lucide-react'

interface DragPreviewProps {
  type: 'folder' | 'template'
  name: string
}

export function DragPreview({ type, name }: DragPreviewProps) {
  const Icon = type === 'folder' ? Folder : FileText

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-lg">
      <Icon className="h-4 w-4 text-primary" />
      <span className="max-w-[200px] truncate text-sm font-medium">{name}</span>
    </div>
  )
}
