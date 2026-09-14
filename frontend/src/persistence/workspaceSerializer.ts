import type { Edge, Node } from '@xyflow/react'
import type { SystemParams } from '../types/topology'
import { WORKSPACE_VERSION } from './workspaceSchema'

export interface SerializableTab {
  readonly id: string
  readonly name: string
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  readonly params: SystemParams
}

export interface CanvasSnapshot {
  readonly tabId: string
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  readonly params: SystemParams
}

export interface SerializedTab {
  readonly id: string
  readonly name: string
  readonly nodes: readonly Record<string, unknown>[]
  readonly edges: readonly Record<string, unknown>[]
  readonly params: SystemParams
}

export interface SerializedWorkspace {
  readonly version: typeof WORKSPACE_VERSION
  readonly activeTabId: string
  readonly tabs: readonly SerializedTab[]
}

const TRANSIENT_NODE_KEYS: ReadonlySet<string> = new Set(['selected', 'dragging', 'resizing', 'measured'])
const TRANSIENT_EDGE_KEYS: ReadonlySet<string> = new Set(['selected'])

function withoutKeys(value: object, keys: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.has(key)))
}

function applySnapshot(tab: SerializableTab, activeTabId: string, snapshot: CanvasSnapshot | null): SerializableTab {
  if (!snapshot || tab.id !== activeTabId || snapshot.tabId !== activeTabId) return tab
  return { ...tab, nodes: snapshot.nodes, edges: snapshot.edges, params: snapshot.params }
}

function serializeTab(tab: SerializableTab): SerializedTab {
  return {
    id: tab.id,
    name: tab.name,
    nodes: tab.nodes.map((node) => withoutKeys(node, TRANSIENT_NODE_KEYS)),
    edges: tab.edges.map((edge) => withoutKeys(edge, TRANSIENT_EDGE_KEYS)),
    params: { ...tab.params },
  }
}

export function toPersistedWorkspace(
  tabs: readonly SerializableTab[],
  activeTabId: string,
  snapshot: CanvasSnapshot | null,
): SerializedWorkspace {
  return {
    version: WORKSPACE_VERSION,
    activeTabId,
    tabs: tabs.map((tab) => serializeTab(applySnapshot(tab, activeTabId, snapshot))),
  }
}
