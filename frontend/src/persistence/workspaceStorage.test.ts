import { describe, expect, it } from 'vitest'
import { createFakeStorage } from '../test/fakeStorage'
import { toPersistedWorkspace } from './workspaceSerializer'
import {
  CORRUPT_BACKUP_KEY,
  WORKSPACE_STORAGE_KEY,
  getBrowserStorage,
  loadWorkspace,
  saveWorkspace,
} from './workspaceStorage'

const quotaError = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError')
const blockedError = () => new DOMException('Access is denied.', 'SecurityError')

const sampleJson = JSON.stringify(
  toPersistedWorkspace(
    [
      {
        id: 'tab-1',
        name: 'Checkout',
        nodes: [{ id: 'node-1', position: { x: 1, y: 2 }, data: { label: 'Client' } }],
        edges: [],
        params: { dau: 42 },
      },
    ],
    'tab-1',
    null,
  ),
)

describe('getBrowserStorage', () => {
  it('returns the storage when a probe write works and leaves no probe behind', () => {
    const storage = createFakeStorage()

    expect(getBrowserStorage(() => storage)).toBe(storage)
    expect(storage.length).toBe(0)
  })

  it('returns null when reading the storage or writing the probe throws', () => {
    expect(
      getBrowserStorage(() => {
        throw blockedError()
      }),
    ).toBeNull()
    expect(getBrowserStorage(() => createFakeStorage({}, { setError: blockedError() }))).toBeNull()
  })
})

describe('loadWorkspace', () => {
  it('reports unavailable storage', () => {
    expect(loadWorkspace(null)).toEqual({ status: 'unavailable' })
    expect(loadWorkspace(createFakeStorage({}, { getError: blockedError() }))).toEqual({ status: 'unavailable' })
  })

  it('reports an empty storage', () => {
    expect(loadWorkspace(createFakeStorage())).toEqual({ status: 'empty' })
  })

  it('loads what saveWorkspace wrote', () => {
    const storage = createFakeStorage()

    expect(saveWorkspace(storage, sampleJson)).toEqual({ ok: true })
    const result = loadWorkspace(storage)

    expect(result.status).toBe('loaded')
    expect(result.status === 'loaded' && result.workspace.tabs[0]).toMatchObject({
      id: 'tab-1',
      name: 'Checkout',
      params: { dau: 42 },
    })
  })

  it('backs up invalid JSON and leaves the main key untouched', () => {
    const storage = createFakeStorage({ [WORKSPACE_STORAGE_KEY]: '{not json' })

    expect(loadWorkspace(storage)).toEqual({ status: 'corrupt', backedUp: true })
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{not json')
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe('{not json')
  })

  it('treats a schema mismatch or an invalid version as corrupt', () => {
    const missingTabs = JSON.stringify({ version: 1, activeTabId: 'tab-1' })
    const stringVersion = JSON.stringify({ ...JSON.parse(sampleJson), version: '1' })

    expect(loadWorkspace(createFakeStorage({ [WORKSPACE_STORAGE_KEY]: missingTabs }))).toEqual({
      status: 'corrupt',
      backedUp: true,
    })
    expect(loadWorkspace(createFakeStorage({ [WORKSPACE_STORAGE_KEY]: stringVersion }))).toEqual({
      status: 'corrupt',
      backedUp: true,
    })
  })

  it('reports a failed backup without touching the main key', () => {
    const storage = createFakeStorage(
      { [WORKSPACE_STORAGE_KEY]: '{not json' },
      { setError: quotaError(), failingSetKey: CORRUPT_BACKUP_KEY },
    )

    expect(loadWorkspace(storage)).toEqual({ status: 'corrupt', backedUp: false })
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe('{not json')
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBeNull()
  })

  it('leaves a workspace from a newer version alone', () => {
    const newer = JSON.stringify({ ...JSON.parse(sampleJson), version: 2 })
    const storage = createFakeStorage({ [WORKSPACE_STORAGE_KEY]: newer })

    expect(loadWorkspace(storage)).toEqual({ status: 'unsupported-version' })
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(newer)
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBeNull()
  })
})

describe('saveWorkspace', () => {
  it('writes the JSON to the workspace key', () => {
    const storage = createFakeStorage()

    expect(saveWorkspace(storage, sampleJson)).toEqual({ ok: true })
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(sampleJson)
  })

  it('reports a full storage as quota', () => {
    expect(saveWorkspace(createFakeStorage({}, { setError: quotaError() }), sampleJson)).toEqual({
      ok: false,
      reason: 'quota',
    })
  })

  it('reports missing or failing storage as unavailable', () => {
    expect(saveWorkspace(null, sampleJson)).toEqual({ ok: false, reason: 'unavailable' })
    expect(saveWorkspace(createFakeStorage({}, { setError: blockedError() }), sampleJson)).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})
