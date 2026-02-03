import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, UserCog, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoleBadge } from './RoleBadge'
import { StatusIndicator } from './StatusIndicator'
import { ChangeRoleDialog } from './ChangeRoleDialog'
import { RemoveMemberDialog } from './RemoveMemberDialog'

const TH_CLASS = 'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'

export interface MemberRow {
  id: string
  userId: string
  email: string
  fullName: string
  role: string
  status: string
}

interface MembersTableProps {
  members: MemberRow[]
  assignableRoles: string[]
  canChangeRole: boolean
  canRemove: boolean
  onChangeRole?: (memberId: string, newRole: string) => Promise<void>
  onRemove?: (memberId: string) => Promise<void>
  /** For system level, remove uses userId instead of memberId */
  removeByUserId?: boolean
}

export function MembersTable({
  members,
  assignableRoles,
  canChangeRole,
  canRemove,
  onChangeRole,
  onRemove,
  removeByUserId = false,
}: MembersTableProps) {
  const { t } = useTranslation()
  const [changeRoleTarget, setChangeRoleTarget] = useState<MemberRow | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)

  const hasActions = canChangeRole || canRemove

  return (
    <>
      <div className="rounded-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className={TH_CLASS}>{t('members.table.name', 'Name')}</th>
              <th className={TH_CLASS}>{t('members.table.email', 'Email')}</th>
              <th className={TH_CLASS}>{t('members.table.role', 'Role')}</th>
              <th className={TH_CLASS}>{t('members.table.status', 'Status')}</th>
              {hasActions && (
                <th className={`${TH_CLASS} w-12`} />
              )}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={hasActions ? 5 : 4} className="p-8 text-center text-sm text-muted-foreground">
                  {t('members.table.empty', 'No members found')}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{member.fullName || '—'}</td>
                  <td className="p-4 font-mono text-sm text-muted-foreground">{member.email}</td>
                  <td className="p-4">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="p-4">
                    <StatusIndicator status={member.status} />
                  </td>
                  {hasActions && (
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canChangeRole && onChangeRole && (
                            <DropdownMenuItem onClick={() => setChangeRoleTarget(member)}>
                              <UserCog className="mr-2 h-4 w-4" />
                              {t('members.actions.changeRole', 'Change Role')}
                            </DropdownMenuItem>
                          )}
                          {canRemove && onRemove && (
                            <DropdownMenuItem
                              onClick={() => setRemoveTarget(member)}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              {t('members.actions.remove', 'Remove')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {changeRoleTarget && onChangeRole && (
        <ChangeRoleDialog
          open={!!changeRoleTarget}
          onOpenChange={(open) => !open && setChangeRoleTarget(null)}
          memberName={changeRoleTarget.fullName || changeRoleTarget.email}
          currentRole={changeRoleTarget.role}
          assignableRoles={assignableRoles}
          onSubmit={(newRole) => onChangeRole(changeRoleTarget.id, newRole)}
        />
      )}

      {removeTarget && onRemove && (
        <RemoveMemberDialog
          open={!!removeTarget}
          onOpenChange={(open) => !open && setRemoveTarget(null)}
          memberName={removeTarget.fullName || removeTarget.email}
          onConfirm={() =>
            onRemove(removeByUserId ? removeTarget.userId : removeTarget.id)
          }
        />
      )}
    </>
  )
}
