import type { Node } from '@xyflow/react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toPersistedWorkspace } from '../persistence/workspaceSerializer'
import { CORRUPT_BACKUP_KEY, WORKSPACE_STORAGE_KEY } from '../persistence/workspaceStorage'
import { generateNodeId } from '../utils/nodeId'
import { SAVE_DEBOUNCE_MS } from './useWorkspacePersistence'
import { useCanvasTabs } from './useCanvasTabs'

const node = (id: string): Node => ({ id, position: { x: 0, y: 0 }, data: { label: id, componentType: 'service' } })

const storedWorkspace = (nodeId: string) =>
  JSON.stringify(
    toPersistedWorkspace(
      [
        { id: 'tab-a', name: 'Checkout', nodes: [node(nodeId)], edges: [], params: { dau: 7 } },
        { id: 'tab-b', name: 'Search', nodes: [], edges: [], params: {} },
      ],
      'tab-b',
      null,
    ),
  )

const readStored = () => JSON.parse(window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? 'null')

describe('useCanvasTabs', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
  })

  it('starts with one empty Untitled 1 tab when nothing is stored', () => {
    const { result } = renderHook(() => useCanvasTabs())

    expect(result.current.tabs.map((tab) => tab.name)).toEqual(['Untitled 1'])
    expect(result.current.activeTab.id).toBe(result.current.activeTabId)
    expect(result.current.restoreFailed).toBe(false)
    expect(result.current.persistenceBlocked).toBeNull()
  })

  it('restores stored tabs, params and the active tab', () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, storedWorkspace('node-3'))

    const { result } = renderHook(() => useCanvasTabs())

    expect(result.current.tabs.map((tab) => tab.name)).toEqual(['Checkout', 'Search'])
    expect(result.current.activeTabId).toBe('tab-b')
    expect(result.current.tabs[0].params).toEqual({ dau: 7 })
    expect(result.current.tabs[0].nodes.map((item) => item.id)).toEqual(['node-3'])
  })

  it('moves the node id counter past restored node ids', () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, storedWorkspace('node-50'))

    renderHook(() => useCanvasTabs())

    expect(generateNodeId()).toBe('node-51')
  })

  it('saves tab changes after the debounce delay', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCanvasTabs())

    act(() => {
      result.current.addTab()
    })
    act(() => {
      result.current.renameTab(result.current.activeTabId, 'Payments')
    })
    act(() => {
      vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    })

    expect(readStored().tabs.map((tab: { name: string }) => tab.name)).toEqual(['Untitled 1', 'Payments'])
  })

  it('keeps the canvas snapshot, including params, when switching tabs', () => {
    const { result } = renderHook(() => useCanvasTabs())
    const firstTabId = result.current.activeTabId

    act(() => {
      result.current.updateCanvasStateRef(firstTabId, [node('node-1')], [], { dau: 5 })
    })
    act(() => {
      result.current.addTab()
    })
    act(() => {
      result.current.switchTab(firstTabId)
    })

    expect(result.current.activeTab.params).toEqual({ dau: 5 })
    expect(result.current.activeTab.nodes.map((item) => item.id)).toEqual(['node-1'])
  })

  it('ignores a snapshot reported for a tab that is no longer active', () => {
    const { result } = renderHook(() => useCanvasTabs())
    const firstTabId = result.current.activeTabId

    act(() => {
      result.current.updateCanvasStateRef(firstTabId, [node('node-1')], [], {})
    })
    act(() => {
      result.current.addTab()
    })
    act(() => {
      result.current.updateCanvasStateRef(firstTabId, [node('node-9')], [], {})
    })
    act(() => {
      result.current.switchTab(firstTabId)
    })

    expect(result.current.activeTab.nodes.map((item) => item.id)).toEqual(['node-1'])
  })

  it('activates the neighbouring tab when the active tab is closed', () => {
    const { result } = renderHook(() => useCanvasTabs())
    act(() => {
      result.current.addTab()
    })
    const secondTabId = result.current.activeTabId
    act(() => {
      result.current.addTab()
    })
    const thirdTabId = result.current.activeTabId
    act(() => {
      result.current.switchTab(secondTabId)
    })

    act(() => {
      result.current.closeTab(secondTabId)
    })

    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.activeTabId).toBe(thirdTabId)
  })

  it('flushes the current canvas snapshot immediately', () => {
    const { result } = renderHook(() => useCanvasTabs())

    act(() => {
      result.current.updateCanvasStateRef(result.current.activeTabId, [node('node-4')], [], { avgQPS: 3 })
    })
    act(() => {
      result.current.flush()
    })

    expect(readStored().tabs[0].nodes.map((item: { id: string }) => item.id)).toEqual(['node-4'])
    expect(readStored().tabs[0].params).toEqual({ avgQPS: 3 })
  })

  it('reports restore problems', () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, '{not json')
    const corrupt = renderHook(() => useCanvasTabs())
    expect(corrupt.result.current.restoreFailed).toBe(true)
    expect(corrupt.result.current.persistenceBlocked).toBeNull()
    expect(window.localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe('{not json')

    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ ...JSON.parse(storedWorkspace('node-1')), version: 2 }))
    const newer = renderHook(() => useCanvasTabs())
    expect(newer.result.current.persistenceBlocked).toBe('newer-version')

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Access is denied.', 'SecurityError')
    })
    const unavailable = renderHook(() => useCanvasTabs())
    expect(unavailable.result.current.persistenceBlocked).toBe('unavailable')
  })

  it('blocks saving when a corrupt workspace cannot be backed up', () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, '{not json')
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === CORRUPT_BACKUP_KEY) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      originalSetItem.call(this, key, value)
    })

    const { result } = renderHook(() => useCanvasTabs())
    act(() => {
      result.current.flush()
    })

    expect(result.current.persistenceBlocked).toBe('backup-failed')
    expect(result.current.restoreFailed).toBe(false)
    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe('{not json')
  })
})
