import type { PersistenceBlock } from '../hooks/useWorkspacePersistence'

export type NoticeKind = PersistenceBlock | 'quota' | 'restore-failed'

export interface NoticeState {
  readonly persistenceBlocked: PersistenceBlock | null
  readonly saveError: 'quota' | null
  readonly restoreFailed: boolean
}

export function selectNotice({ persistenceBlocked, saveError, restoreFailed }: NoticeState): NoticeKind | null {
  if (persistenceBlocked !== null) return persistenceBlocked
  if (saveError !== null) return saveError
  return restoreFailed ? 'restore-failed' : null
}

export const NOTICE_MESSAGES: Readonly<Record<NoticeKind, string>> = {
  'newer-version':
    "This workspace was saved by a newer version of ArchitectMind. Reload to update — changes in this window won't be saved.",
  'backup-failed':
    "Your saved workspace couldn't be restored or backed up. To protect it, changes in this window won't be saved.",
  unavailable: "This browser is blocking local storage — changes won't be kept after you close the app.",
  quota: "Storage is full — recent changes couldn't be saved.",
  'restore-failed': "Your saved workspace couldn't be restored. A backup was kept in this browser.",
}
