import { describe, expect, it, vi } from 'vitest'
import { NODE_TYPE_CONFIG } from '../nodes/nodeConfig'
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
        nodes: [{ id: 'node-1', position: { x: 1, y: 2 }, data: { label: 'Client', componentType: 'client' } }],
        edges: [],
        params: { dau: 42 },
      },
    ],
    'tab-1',
    null,
  ),
)

const componentNode = (id: string, data: Readonly<Record<string, unknown>>) => ({
  id,
  type: 'architecture',
  position: { x: 0, y: 0 },
  data: { label: id, properties: {}, ...data },
})

const twoTabWorkspaceJson = (secondTabNodes: readonly Record<string, unknown>[]) =>
  JSON.stringify({
    version: 1,
    activeTabId: 'tab-1',
    tabs: [
      { id: 'tab-1', name: 'One', nodes: [componentNode('node-1', { componentType: 'client' })], edges: [], params: {} },
      { id: 'tab-2', name: 'Two', nodes: secondTabNodes, edges: [], params: {} },
    ],
  })

function expectLeftAloneAsNewer(json: string): void {
  const storage = createFakeStorage({ [WORKSPACE_STORAGE_KEY]: json })
  const setItem = vi.spyOn(storage, 'setItem')

  expect(loadWorkspace(storage)).toEqual({ status: 'unsupported-version' })
  expect(setItem).not.toHaveBeenCalled()
  expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(json)
}

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

  it.each([
    { problem: 'an unknown component type', data: { componentType: 'serverless' } },
    { problem: 'no component type', data: {} },
    { problem: 'an inherited object key as its component type', data: { componentType: 'toString' } },
  ])('treats a node with $problem as saved by a newer version', ({ data }) => {
    expectLeftAloneAsNewer(twoTabWorkspaceJson([componentNode('node-2', data)]))
  })

  it.each([
    { problem: 'an unknown role', data: { componentType: 'service', roles: ['service', 'serverless'] } },
    { problem: 'roles that are not an array', data: { componentType: 'service', roles: 'service' } },
  ])('treats a merged node with $problem as saved by a newer version', ({ data }) => {
    expectLeftAloneAsNewer(twoTabWorkspaceJson([componentNode('node-2', data)]))
  })

  it('loads nodes of every known component type and merged nodes with known roles', () => {
    const componentTypes = Object.keys(NODE_TYPE_CONFIG)
    const nodes = [
      ...componentTypes.map((componentType, index) => componentNode(`node-${index + 2}`, { componentType })),
      componentNode('node-90', { componentType: 'service', roles: ['service', 'cache'], mergedFrom: {} }),
      componentNode('node-91', { componentType: 'database', roles: ['database'] }),
    ]
    const storage = createFakeStorage({ [WORKSPACE_STORAGE_KEY]: twoTabWorkspaceJson(nodes) })

    const result = loadWorkspace(storage)

    expect(result.status).toBe('loaded')
    expect(result.status === 'loaded' && result.workspace.tabs[1].nodes.map((item) => item.id)).toEqual(
      nodes.map((item) => item.id),
    )
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
