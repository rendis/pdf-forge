import { useTranslation } from 'react-i18next'

const TH_CLASS = 'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'

export function AuditTab(): React.ReactElement {
  const { t } = useTranslation()

  // Mock data - replace with actual API call
  const logs = [
    { id: '1', action: 'User Login', user: 'john@example.com', timestamp: '2 mins ago', details: 'Successful login from 192.168.1.1' },
    { id: '2', action: 'Template Created', user: 'jane@example.com', timestamp: '1 hour ago', details: 'Created "NDA Standard v3"' },
    { id: '3', action: 'Document Signed', user: 'bob@example.com', timestamp: '3 hours ago', details: 'Signed "Contract-2024-001"' },
    { id: '4', action: 'User Added', user: 'admin@example.com', timestamp: 'Yesterday', details: 'Added user alice@example.com' },
    { id: '5', action: 'Settings Changed', user: 'admin@example.com', timestamp: '2 days ago', details: 'Updated system security settings' },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('administration.audit.description', 'View system activity and security logs.')}
      </p>

      <div className="rounded-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className={TH_CLASS}>{t('administration.audit.columns.action', 'Action')}</th>
              <th className={TH_CLASS}>{t('administration.audit.columns.user', 'User')}</th>
              <th className={TH_CLASS}>{t('administration.audit.columns.details', 'Details')}</th>
              <th className={TH_CLASS}>{t('administration.audit.columns.timestamp', 'Timestamp')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">{log.action}</td>
                <td className="p-4 font-mono text-sm text-muted-foreground">{log.user}</td>
                <td className="p-4 text-sm text-muted-foreground">{log.details}</td>
                <td className="p-4 font-mono text-sm text-muted-foreground">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
