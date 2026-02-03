import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InjectablesTab } from '@/features/system-injectables'
import { useAppContextStore } from '@/stores/app-context-store'
import { useTranslation } from 'react-i18next'
import { AuditTab } from './AuditTab'
import { DocumentTypesTab } from './DocumentTypesTab'
import { TenantsTab } from './TenantsTab'
import { WorkspacesTab } from './WorkspacesTab'

const TAB_TRIGGER_CLASS = 'font-mono text-xs uppercase tracking-widest'

export function AdministrationPage(): React.ReactElement {
  const { t } = useTranslation()
  const { isGlobalSystemWorkspace, isTenantSystemWorkspace } = useAppContextStore()

  const isGlobal = isGlobalSystemWorkspace()
  const isTenant = isTenantSystemWorkspace()

  return (
    <div className="animate-page-enter flex-1 overflow-y-auto bg-background">
      <header className="px-4 pb-6 pt-12 md:px-6">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {isGlobal
            ? t('administration.label', 'System')
            : t('administration.labelTenant', 'Tenant')}
        </div>
        <h1 className="font-display text-4xl font-light tracking-tight">
          {t('administration.title', 'Administration')}
        </h1>
      </header>

      <main className="px-4 pb-12 md:px-6">
        {isGlobal && (
          <Tabs defaultValue="tenants">
            <TabsList className="mb-6">
              <TabsTrigger value="tenants" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.tenants', 'Tenants')}
              </TabsTrigger>
              <TabsTrigger value="injectables" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.injectables', 'Injectables')}
              </TabsTrigger>
              <TabsTrigger value="audit" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.audit', 'Audit')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tenants">
              <TenantsTab />
            </TabsContent>

            <TabsContent value="injectables">
              <InjectablesTab />
            </TabsContent>

            <TabsContent value="audit">
              <AuditTab />
            </TabsContent>
          </Tabs>
        )}

        {isTenant && (
          <Tabs defaultValue="workspaces">
            <TabsList className="mb-6">
              <TabsTrigger value="workspaces" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.workspaces', 'Workspaces')}
              </TabsTrigger>
              <TabsTrigger value="document-types" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.documentTypes', 'Document Types')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workspaces">
              <WorkspacesTab />
            </TabsContent>

            <TabsContent value="document-types">
              <DocumentTypesTab />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
