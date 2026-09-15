import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SerializedWorkspace } from '../persistence/workspaceSerializer'
import { WORKSPACE_STORAGE_KEY, type SaveResult } from '../persistence/workspaceStorage'
import { createFakeStorage } from '../test/fakeStorage'
import {
  SAVE_DEBOUNCE_MS,
  useWorkspacePersistence,
  type WorkspacePersistenceOptions,
} from './useWorkspacePersistence'

const workspace = (name: string): SerializedWorkspace => ({
  version: 1,
  activeTabId: 'tab-1',
  tabs: [{ id: 'tab-1', name, nodes: [], edges: [], params: {} }],
})

describe('useWorkspacePersistence', () => {
  let current: SerializedWorkspace

  const render = (overrides: Partial<WorkspacePersistenceOptions> = {}) => {
    const storage = createFakeStorage()
    const options: WorkspacePersistenceOptions = {
      storage,
      blocked: null,
      initialJson: JSON.stringify(workspace('One')),
      getWorkspace: () => current,
      ...overrides,
    }
    const hook = renderHook((props: WorkspacePersistenceOptions) => useWorkspacePersistence(props), {
      initialProps: options,
    })
    return { hook, storage: options.storage ?? storage }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    current = workspace('One')
  })

  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(document, 'visibilityState')
    Reflect.deleteProperty(navigator, 'storage')
  })

  it('writes once for several changes within the debounce window', () => {
    const { hook, storage } = render()
    const setItem = vi.spyOn(storage, 'setItem')
    current = workspace('Two')

    act(() => {
      hook.result.current.scheduleSave()
      vi.advanceTimersByTime(100)
      hook.result.current.scheduleSave()
      vi.advanceTimersByTime(100)
      hook.result.current.scheduleSave()
    })
    expect(setItem).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    })

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace('Two')))
  })

  it('does not write when the workspace equals the last persisted JSON', () => {
    const { hook, storage } = render()
    const setItem = vi.spyOn(storage, 'setItem')

    act(() => {
      hook.result.current.scheduleSave()
      vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    })
    let result: SaveResult = { ok: false, reason: 'unavailable' }
    act(() => {
      result = hook.result.current.flush()
    })

    expect(result).toEqual({ ok: true })
    expect(setItem).not.toHaveBeenCalled()
  })

  it('writes immediately on pagehide and when the page becomes hidden', () => {
    const { storage } = render()
    const setItem = vi.spyOn(storage, 'setItem')

    current = workspace('Two')
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(setItem).toHaveBeenCalledTimes(1)

    current = workspace('Three')
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(setItem).toHaveBeenCalledTimes(2)
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace('Three')))
  })

  it('reports a full storage, retries, and clears the error after a successful write', () => {
    const { hook, storage } = render()
    vi.spyOn(storage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })
    current = workspace('Two')

    let result: SaveResult = { ok: true }
    act(() => {
      result = hook.result.current.flush()
    })
    expect(result).toEqual({ ok: false, reason: 'quota' })
    expect(hook.result.current.saveError).toBe('quota')

    act(() => {
      result = hook.result.current.flush()
    })

    expect(result).toEqual({ ok: true })
    expect(hook.result.current.saveError).toBeNull()
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace('Two')))
  })

  it('never writes while persistence is blocked', () => {
    const blocked = render({ blocked: 'newer-version' })
    const setItem = vi.spyOn(blocked.storage, 'setItem')
    current = workspace('Two')

    let result: SaveResult = { ok: true }
    act(() => {
      result = blocked.hook.result.current.flush()
    })
    expect(result).toEqual({ ok: false, reason: 'blocked' })
    expect(setItem).not.toHaveBeenCalled()
    expect(blocked.hook.result.current.saveError).toBeNull()

    const unavailable = render({ storage: null, blocked: 'unavailable' })
    act(() => {
      result = unavailable.hook.result.current.flush()
    })
    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('writes pending changes when it unmounts', () => {
    const { hook, storage } = render()
    current = workspace('Two')

    act(() => {
      hook.result.current.scheduleSave()
    })
    hook.unmount()

    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace('Two')))
  })

  it('asks the browser to keep the storage once, after the first successful write', () => {
    const persist = vi.fn(() => Promise.resolve(true))
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist } })
    const { hook } = render()

    current = workspace('Two')
    act(() => {
      hook.result.current.flush()
    })
    current = workspace('Three')
    act(() => {
      hook.result.current.flush()
    })

    expect(persist).toHaveBeenCalledTimes(1)
  })
})
