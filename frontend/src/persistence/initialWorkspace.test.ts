import { describe, expect, it } from 'vitest'
import { createFakeStorage } from '../test/fakeStorage'
import { createInitialWorkspace } from './initialWorkspace'
import { WORKSPACE_STORAGE_KEY } from './workspaceStorage'

const storedWith = (node: Readonly<Record<string, unknown>>) =>
  createFakeStorage({
    [WORKSPACE_STORAGE_KEY]: JSON.stringify({
      version: 1,
      activeTabId: 'tab-1',
      tabs: [{ id: 'tab-1', name: 'Checkout', nodes: [node], edges: [], params: {} }],
    }),
  })

describe('createInitialWorkspace', () => {
  it('does not restore domAttributes onto nodes', () => {
    const storage = storedWith({
      id: 'node-1',
      type: 'architecture',
      position: { x: 5, y: 6 },
      data: { label: 'Client', componentType: 'client', properties: {} },
      domAttributes: { 'data-injected': 'yes', tabIndex: 7 },
    })

    const workspace = createInitialWorkspace(storage)
    const [restored] = workspace.tabs[0].nodes

    expect(workspace.blocked).toBeNull()
    expect(restored).not.toHaveProperty('domAttributes')
    expect(restored).toEqual({
      id: 'node-1',
      type: 'architecture',
      position: { x: 5, y: 6 },
      data: { label: 'Client', componentType: 'client', properties: {} },
    })
    expect(workspace.initialJson).not.toContain('domAttributes')
  })

  it('starts blank and blocks saving when a node uses a component type this build does not know', () => {
    const storage = storedWith({
      id: 'node-1',
      type: 'architecture',
      position: { x: 0, y: 0 },
      data: { label: 'Function', componentType: 'serverless', properties: {} },
    })

    const workspace = createInitialWorkspace(storage)

    expect(workspace.blocked).toBe('newer-version')
    expect(workspace.restoreFailed).toBe(false)
    expect(workspace.tabs.map((tab) => ({ name: tab.name, nodes: tab.nodes.length }))).toEqual([
      { name: 'Untitled 1', nodes: 0 },
    ])
  })
})
