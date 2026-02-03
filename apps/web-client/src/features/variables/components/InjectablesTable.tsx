import { useTranslation } from 'react-i18next'
import { InjectableRow } from './InjectableRow'
import type { WorkspaceInjectable } from '../types'

interface InjectablesTableProps {
  injectables: WorkspaceInjectable[]
  onEdit: (injectable: WorkspaceInjectable) => void
  onDelete: (injectable: WorkspaceInjectable) => void
}

export function InjectablesTable({
  injectables,
  onEdit,
  onDelete,
}: InjectablesTableProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <table className="w-full border-collapse text-left">
      <thead className="sticky top-0 z-10 bg-background">
        <tr>
          <th className="w-[25%] border-b border-border py-4 pl-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
            {t('variables.columns.key', 'Variable Key')}
          </th>
          <th className="w-[30%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
            {t('variables.columns.label', 'Display Label')}
          </th>
          <th className="w-[20%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
            {t('variables.columns.description', 'Description')}
          </th>
          <th className="w-[15%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
            {t('variables.columns.defaultValue', 'Default Value')}
          </th>
          <th className="w-[10%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
            {t('variables.columns.status', 'Status')}
          </th>
          <th className="w-[10%] border-b border-border py-4 pr-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center justify-center">
              {t('variables.columns.action', 'Action')}
            </div>
          </th>
        </tr>
      </thead>
      <tbody className="font-light">
        {injectables.map((injectable, index) => (
          <InjectableRow
            key={injectable.id}
            injectable={injectable}
            index={index}
            onEdit={() => onEdit(injectable)}
            onDelete={() => onDelete(injectable)}
          />
        ))}
      </tbody>
    </table>
  )
}
