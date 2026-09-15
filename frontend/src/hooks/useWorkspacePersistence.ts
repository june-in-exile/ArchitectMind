import { useCallback, useEffect, useRef, useState } from 'react'
import type { SerializedWorkspace } from '../persistence/workspaceSerializer'
import { saveWorkspace, type SaveResult } from '../persistence/workspaceStorage'

export const SAVE_DEBOUNCE_MS = 500

export type PersistenceBlock = 'unavailable' | 'newer-version' | 'backup-failed'

export interface WorkspacePersistenceOptions {
  readonly storage: Storage | null
  readonly blocked: PersistenceBlock | null
  readonly initialJson: string | null
  readonly getWorkspace: () => SerializedWorkspace
}

export interface WorkspacePersistence {
  readonly scheduleSave: () => void
  readonly flush: () => SaveResult
  readonly saveError: 'quota' | null
}

export function useWorkspacePersistence({
  storage,
  blocked,
  initialJson,
  getWorkspace,
}: WorkspacePersistenceOptions): WorkspacePersistence {
  const [saveError, setSaveError] = useState<'quota' | null>(null)
  const lastPersistedJsonRef = useRef(initialJson)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistRequestedRef = useRef(false)
  const getWorkspaceRef = useRef(getWorkspace)

  useEffect(() => {
    getWorkspaceRef.current = getWorkspace
  }, [getWorkspace])

  const cancelPendingSave = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const writeIfChanged = useCallback((): SaveResult => {
    if (blocked === 'unavailable') return { ok: false, reason: 'unavailable' }
    if (blocked !== null) return { ok: false, reason: 'blocked' }

    const json = JSON.stringify(getWorkspaceRef.current())
    if (json === lastPersistedJsonRef.current) return { ok: true }

    const result = saveWorkspace(storage, json)
    if (result.ok) {
      lastPersistedJsonRef.current = json
      if (!persistRequestedRef.current) {
        persistRequestedRef.current = true
        void navigator.storage?.persist?.()?.catch(() => false)
      }
    }
    return result
  }, [blocked, storage])

  const flush = useCallback((): SaveResult => {
    cancelPendingSave()
    const result = writeIfChanged()
    setSaveError(!result.ok && result.reason === 'quota' ? 'quota' : null)
    return result
  }, [cancelPendingSave, writeIfChanged])

  const scheduleSave = useCallback(() => {
    cancelPendingSave()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      flush()
    }, SAVE_DEBOUNCE_MS)
  }, [cancelPendingSave, flush])

  useEffect(() => {
    const onPageHide = () => {
      flush()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [flush])

  useEffect(
    () => () => {
      cancelPendingSave()
      writeIfChanged()
    },
    [cancelPendingSave, writeIfChanged],
  )

  return { scheduleSave, flush, saveError }
}
