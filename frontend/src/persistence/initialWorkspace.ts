import type { Edge, Node } from '@xyflow/react'
import type { PersistenceBlock } from '../hooks/useWorkspacePersistence'
import type { SystemParams } from '../types/topology'
import { seedNodeIdCounter } from '../utils/nodeId'
import type { PersistedTab } from './workspaceSchema'
import { toPersistedWorkspace } from './workspaceSerializer'
import { loadWorkspace } from './workspaceStorage'

export interface CanvasTab {
  readonly id: string
  readonly name: string
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  readonly params: SystemParams
}

export interface InitialWorkspace {
  readonly storage: Storage | null
  readonly tabs: readonly CanvasTab[]
  readonly activeTabId: string
  readonly blocked: PersistenceBlock | null
  readonly restoreFailed: boolean
  readonly initialJson: string
}

let tabCounter = 0

function generateTabId(): string {
  tabCounter += 1
  return `tab-${Date.now()}-${tabCounter}`
}

export function createEmptyTab(name: string): CanvasTab {
  return { id: generateTabId(), name, nodes: [], edges: [], params: {} }
}

function toCanvasTab(tab: PersistedTab): CanvasTab {
  // workspaceSchema validated id, position and data; React Flow takes the other stored fields as they are.
  return {
    id: tab.id,
    name: tab.name,
    nodes: tab.nodes as unknown as Node[],
    edges: tab.edges as unknown as Edge[],
    params: tab.params,
  }
}

function withInitialJson(workspace: Omit<InitialWorkspace, 'initialJson'>): InitialWorkspace {
  const serialized = toPersistedWorkspace(workspace.tabs, workspace.activeTabId, null)
  return { ...workspace, initialJson: JSON.stringify(serialized) }
}

function blankWorkspace(
  storage: Storage | null,
  blocked: PersistenceBlock | null,
  restoreFailed: boolean,
): InitialWorkspace {
  const tab = createEmptyTab('Untitled 1')
  return withInitialJson({ storage, tabs: [tab], activeTabId: tab.id, blocked, restoreFailed })
}

export function createInitialWorkspace(storage: Storage | null): InitialWorkspace {
  const result = loadWorkspace(storage)
  switch (result.status) {
    case 'loaded': {
      const tabs = result.workspace.tabs.map(toCanvasTab)
      seedNodeIdCounter(tabs.flatMap((tab) => tab.nodes.map((item) => item.id)))
      return withInitialJson({
        storage,
        tabs,
        activeTabId: result.workspace.activeTabId,
        blocked: null,
        restoreFailed: false,
      })
    }
    case 'empty':
      return blankWorkspace(storage, null, false)
    case 'corrupt':
      return blankWorkspace(storage, result.backedUp ? null : 'backup-failed', result.backedUp)
    case 'unsupported-version':
      return blankWorkspace(storage, 'newer-version', false)
    case 'unavailable':
      return blankWorkspace(null, 'unavailable', false)
  }
}
