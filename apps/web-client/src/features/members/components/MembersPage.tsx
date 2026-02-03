import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MembersTable, type MemberRow } from './MembersTable'
import { AddMemberDialog } from './AddMemberDialog'

interface MembersPageProps {
  label: string
  title: string
  description: string
  members: MemberRow[]
  isLoading: boolean
  error: unknown
  assignableRoles: string[]
  canAdd: boolean
  canChangeRole: boolean
  canRemove: boolean
  onAdd: (data: { email: string; fullName: string; role: string }) => Promise<void>
  onChangeRole?: (memberId: string, newRole: string) => Promise<void>
  onRemove?: (memberId: string) => Promise<void>
  removeByUserId?: boolean
}

export function MembersPage({
  label,
  title,
  description,
  members,
  isLoading,
  error,
  assignableRoles,
  canAdd,
  canChangeRole,
  canRemove,
  onAdd,
  onChangeRole,
  onRemove,
  removeByUserId,
}: MembersPageProps) {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="animate-page-enter flex-1 overflow-y-auto bg-background">
      <header className="px-4 pb-6 pt-12 md:px-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
            <h1 className="font-display text-4xl font-light tracking-tight">{title}</h1>
          </div>
          {canAdd && (
            <Button
              onClick={() => setAddOpen(true)}
              className="rounded-none bg-foreground text-background hover:bg-foreground/90"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t('members.add.button', 'ADD MEMBER')}
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </header>

      <main className="px-4 pb-12 md:px-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-sm border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
            {t('members.error.load', 'Failed to load members')}
          </div>
        ) : (
          <MembersTable
            members={members}
            assignableRoles={assignableRoles}
            canChangeRole={canChangeRole}
            canRemove={canRemove}
            onChangeRole={onChangeRole}
            onRemove={onRemove}
            removeByUserId={removeByUserId}
          />
        )}
      </main>

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        assignableRoles={assignableRoles}
        onSubmit={onAdd}
      />
    </div>
  )
}
