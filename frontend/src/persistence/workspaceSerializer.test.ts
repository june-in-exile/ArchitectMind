import type { Edge, Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { toPersistedWorkspace, type CanvasSnapshot, type SerializableTab } from './workspaceSerializer'

const node = (id: string, extra: Partial<Node> = {}): Node => ({
  id,
  position: { x: 0, y: 0 },
  data: { label: id },
  ...extra,
})
const edge = (id: string, extra: Partial<Edge> = {}): Edge => ({ id, source: 'a', target: 'b', ...extra })

const tabs: readonly SerializableTab[] = [
  { id: 'tab-1', name: 'One', nodes: [node('node-1')], edges: [], params: { dau: 10 } },
  { id: 'tab-2', name: 'Two', nodes: [node('node-2')], edges: [edge('edge-1')], params: {} },
]

describe('toPersistedWorkspace', () => {
  it('writes the version, the active tab and every tab', () => {
    const workspace = toPersistedWorkspace(tabs, 'tab-2', null)

    expect(workspace.version).toBe(1)
    expect(workspace.activeTabId).toBe('tab-2')
    expect(workspace.tabs.map((tab) => tab.name)).toEqual(['One', 'Two'])
    expect(workspace.tabs[0].params).toEqual({ dau: 10 })
  })

  it('uses the canvas snapshot for the active tab', () => {
    const snapshot: CanvasSnapshot = {
      tabId: 'tab-1',
      nodes: [node('node-9')],
      edges: [edge('edge-9')],
      params: { avgQPS: 5 },
    }

    const workspace = toPersistedWorkspace(tabs, 'tab-1', snapshot)

    expect(workspace.tabs[0].nodes.map((item) => item.id)).toEqual(['node-9'])
    expect(workspace.tabs[0].edges.map((item) => item.id)).toEqual(['edge-9'])
    expect(workspace.tabs[0].params).toEqual({ avgQPS: 5 })
    expect(workspace.tabs[1].nodes.map((item) => item.id)).toEqual(['node-2'])
  })

  it('ignores a snapshot that belongs to another tab', () => {
    const snapshot: CanvasSnapshot = { tabId: 'tab-1', nodes: [node('node-9')], edges: [], params: {} }

    const workspace = toPersistedWorkspace(tabs, 'tab-2', snapshot)

    expect(workspace.tabs[0].nodes.map((item) => item.id)).toEqual(['node-1'])
    expect(workspace.tabs[1].nodes.map((item) => item.id)).toEqual(['node-2'])
  })

  it('removes transient node and edge fields and keeps the rest', () => {
    const transientNode = node('node-3', {
      type: 'architecture',
      width: 160,
      selected: true,
      dragging: true,
      resizing: true,
      measured: { width: 160, height: 60 },
    })
    const transientEdge = edge('edge-3', { type: 'handdrawn', selected: true, style: { strokeWidth: 2 } })

    const workspace = toPersistedWorkspace(
      [{ id: 'tab-1', name: 'One', nodes: [transientNode], edges: [transientEdge], params: {} }],
      'tab-1',
      null,
    )

    expect(workspace.tabs[0].nodes[0]).toEqual({
      id: 'node-3',
      position: { x: 0, y: 0 },
      data: { label: 'node-3' },
      type: 'architecture',
      width: 160,
    })
    expect(workspace.tabs[0].edges[0]).toEqual({
      id: 'edge-3',
      source: 'a',
      target: 'b',
      type: 'handdrawn',
      style: { strokeWidth: 2 },
    })
  })

  it('does not modify its inputs', () => {
    const selectedNode = node('node-4', { selected: true })
    const input: readonly SerializableTab[] = [
      { id: 'tab-1', name: 'One', nodes: [selectedNode], edges: [], params: { dau: 1 } },
    ]
    const before = JSON.stringify(input)

    toPersistedWorkspace(input, 'tab-1', null)

    expect(JSON.stringify(input)).toBe(before)
    expect(selectedNode.selected).toBe(true)
  })
})
