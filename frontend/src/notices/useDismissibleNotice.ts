import { useState } from 'react'
import type { NoticeKind } from './selectNotice'

export interface DismissibleNotice {
  readonly visibleKind: NoticeKind | null
  readonly dismiss: () => void
}

/**
 * Keeps a dismissed notice hidden while its kind stays selected. The dismissal clears as soon as the
 * selected kind changes, including to null, so the next occurrence shows again (spec §7).
 */
export function useDismissibleNotice(kind: NoticeKind | null): DismissibleNotice {
  const [dismissedKind, setDismissedKind] = useState<NoticeKind | null>(null)

  if (dismissedKind !== null && dismissedKind !== kind) {
    // Adjusting state while rendering, as the React docs describe for a changed prop.
    setDismissedKind(null)
  }

  return {
    visibleKind: kind === dismissedKind ? null : kind,
    dismiss: () => setDismissedKind(kind),
  }
}
