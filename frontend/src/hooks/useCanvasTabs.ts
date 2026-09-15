import { useCallback, useEffect, useRef, useState } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { SystemParams } from '../types/topology'
import { createEmptyTab, createInitialWorkspace, type CanvasTab } from '../persistence/initialWorkspace'
import { toPersistedWorkspace, type CanvasSnapshot } from '../persistence/workspaceSerializer'
import { getBrowserStorage } from '../persistence/workspaceStorage'
import { useWorkspacePersistence } from './useWorkspacePersistence'

export type { CanvasTab } from '../persistence/initialWorkspace'

function nextActiveTabId(tabs: readonly CanvasTab[], closedTabId: string, activeTabId: string): string {
  if (closedTabId !== activeTabId) return activeTabId
  const closedIndex = tabs.findIndex((tab) => tab.id === closedTabId)
  const remaining = tabs.filter((tab) => tab.id !== closedTabId)
  return remaining[Math.min(closedIndex, remaining.length - 1)].id
}

export function useCanvasTabs() {
  const [initial] = useState(() => createInitialWorkspace(getBrowserStorage()))
  const [tabs, setTabs] = useState<readonly CanvasTab[]>(initial.tabs)
  const [activeTabId, setActiveTabId] = useState(initial.activeTabId)
  const snapshotRef = useRef<CanvasSnapshot | null>(null)
  const tabsRef = useRef(tabs)
  const activeTabIdRef = useRef(activeTabId)

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]

  useEffect(() => {
    tabsRef.current = tabs
    activeTabIdRef.current = activeTabId
  }, [tabs, activeTabId])

  const getWorkspace = useCallback(
    () => toPersistedWorkspace(tabsRef.current, activeTabIdRef.current, snapshotRef.current),
    [],
  )

  const { scheduleSave, flush, saveError } = useWorkspacePersistence({
    storage: initial.storage,
    blocked: initial.blocked,
    initialJson: initial.initialJson,
    getWorkspace,
  })

  useEffect(() => {
    scheduleSave()
  }, [tabs, activeTabId, scheduleSave])

  const saveCurrentCanvasState = useCallback(() => {
    const snapshot = snapshotRef.current
    if (!snapshot || snapshot.tabId !== activeTabId) return
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === snapshot.tabId
          ? { ...tab, nodes: [...snapshot.nodes], edges: [...snapshot.edges], params: { ...snapshot.params } }
          : tab,
      ),
    )
  }, [activeTabId])

  const addTab = useCallback(() => {
    saveCurrentCanvasState()
    const newTab = createEmptyTab(`Untitled ${tabs.length + 1}`)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [saveCurrentCanvasState, tabs.length])

  const switchTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTabId) return
      saveCurrentCanvasState()
      setActiveTabId(tabId)
    },
    [activeTabId, saveCurrentCanvasState],
  )

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return
      setActiveTabId(nextActiveTabId(tabs, tabId, activeTabId))
      setTabs(tabs.filter((tab) => tab.id !== tabId))
    },
    [tabs, activeTabId],
  )

  const renameTab = useCallback((tabId: string, newName: string) => {
    setTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, name: newName } : tab)))
  }, [])

  const updateCanvasStateRef = useCallback(
    (tabId: string, nodes: Node[], edges: Edge[], params: SystemParams) => {
      snapshotRef.current = { tabId, nodes, edges, params }
      scheduleSave()
    },
    [scheduleSave],
  )

  return {
    tabs,
    activeTab,
    activeTabId,
    addTab,
    switchTab,
    closeTab,
    renameTab,
    updateCanvasStateRef,
    flush,
    saveError,
    persistenceBlocked: initial.blocked,
    restoreFailed: initial.restoreFailed,
  }
}
