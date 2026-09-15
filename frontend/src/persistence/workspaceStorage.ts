import { classifyVersion, usesKnownComponentTypes, workspaceSchema, type PersistedWorkspace } from './workspaceSchema'

export const WORKSPACE_STORAGE_KEY = 'architectmind:workspace'
export const CORRUPT_BACKUP_KEY = 'architectmind:workspace:corrupt'
const PROBE_KEY = 'architectmind:probe'

export type LoadResult =
  | { readonly status: 'loaded'; readonly workspace: PersistedWorkspace }
  | { readonly status: 'empty' }
  | { readonly status: 'corrupt'; readonly backedUp: boolean }
  | { readonly status: 'unsupported-version' }
  | { readonly status: 'unavailable' }

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'quota' | 'unavailable' | 'blocked' }

export function getBrowserStorage(readStorage: () => Storage = () => window.localStorage): Storage | null {
  try {
    const storage = readStorage()
    storage.setItem(PROBE_KEY, PROBE_KEY)
    storage.removeItem(PROBE_KEY)
    return storage
  } catch {
    return null
  }
}

function readRaw(storage: Storage): string | null | undefined {
  try {
    return storage.getItem(WORKSPACE_STORAGE_KEY)
  } catch {
    return undefined
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function backUp(storage: Storage, raw: string): boolean {
  try {
    storage.setItem(CORRUPT_BACKUP_KEY, raw)
    return true
  } catch {
    return false
  }
}

export function loadWorkspace(storage: Storage | null): LoadResult {
  if (!storage) return { status: 'unavailable' }
  const raw = readRaw(storage)
  if (raw === undefined) return { status: 'unavailable' }
  if (raw === null) return { status: 'empty' }

  const candidate = parseJson(raw)
  const version = classifyVersion(candidate)
  if (version === 'newer') return { status: 'unsupported-version' }

  const parsed = version === 'current' ? workspaceSchema.safeParse(candidate) : null
  if (!parsed?.success) return { status: 'corrupt', backedUp: backUp(storage, raw) }
  if (!usesKnownComponentTypes(parsed.data)) return { status: 'unsupported-version' }
  return { status: 'loaded', workspace: parsed.data }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

export function saveWorkspace(storage: Storage | null, json: string): SaveResult {
  if (!storage) return { ok: false, reason: 'unavailable' }
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, json)
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unavailable' }
  }
}
