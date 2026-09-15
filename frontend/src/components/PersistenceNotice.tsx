import { useState } from 'react'
import { NOTICE_MESSAGES, selectNotice, type NoticeKind, type NoticeState } from '../notices/selectNotice'
import Toast, { type ToastAction } from './Toast'

interface PersistenceNoticeProps extends NoticeState {
  readonly onReload: () => void
}

export default function PersistenceNotice({ onReload, ...state }: PersistenceNoticeProps) {
  const [dismissedKind, setDismissedKind] = useState<NoticeKind | null>(null)
  const kind = selectNotice(state)
  if (kind === null || kind === dismissedKind) return null

  const dismiss: ToastAction = { label: 'Dismiss', onClick: () => setDismissedKind(kind) }
  const actions: readonly ToastAction[] =
    kind === 'newer-version' ? [{ label: 'Reload', onClick: onReload }, dismiss] : [dismiss]

  return <Toast message={NOTICE_MESSAGES[kind]} actions={actions} />
}
