import { NOTICE_MESSAGES, type NoticeKind } from '../notices/selectNotice'
import Toast, { type ToastAction } from './Toast'

interface PersistenceNoticeProps {
  readonly kind: NoticeKind | null
  readonly onDismiss: () => void
  readonly onReload: () => void
}

export default function PersistenceNotice({ kind, onDismiss, onReload }: PersistenceNoticeProps) {
  if (kind === null) return null

  const dismiss: ToastAction = { label: 'Dismiss', onClick: onDismiss }
  const actions: readonly ToastAction[] =
    kind === 'newer-version' ? [{ label: 'Reload', onClick: onReload }, dismiss] : [dismiss]

  return <Toast message={NOTICE_MESSAGES[kind]} actions={actions} />
}
