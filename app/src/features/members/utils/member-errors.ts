import type { TFunction } from 'i18next'
import { getApiErrorMessage } from '@/lib/api-client'

const ERROR_KEY_MAP: Record<string, string> = {
  'user is already a member of this workspace': 'members.error.alreadyExists',
  'user is already a member of this tenant': 'members.error.alreadyExists',
  'workspace member not found': 'members.error.notFound',
  'tenant member not found': 'members.error.notFound',
  'cannot remove workspace owner': 'members.error.cannotRemoveOwner',
  'cannot remove tenant owner': 'members.error.cannotRemoveOwner',
  'invalid workspace role': 'members.error.invalidRole',
  'invalid tenant role': 'members.error.invalidRole',
  'user already has a system role': 'members.error.alreadyExists',
}

export function getMemberErrorMessage(error: unknown, t: TFunction): string {
  const raw = getApiErrorMessage(error)
  const key = ERROR_KEY_MAP[raw]
  return key ? t(key) : raw
}
