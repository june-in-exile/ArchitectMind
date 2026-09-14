import { beforeEach, describe, expect, it, vi } from 'vitest'

type NodeIdModule = typeof import('./nodeId')

describe('nodeId', () => {
  let nodeId: NodeIdModule

  beforeEach(async () => {
    vi.resetModules()
    nodeId = await import('./nodeId')
  })

  it('starts at node-1 and increments', () => {
    expect(nodeId.generateNodeId()).toBe('node-1')
    expect(nodeId.generateNodeId()).toBe('node-2')
  })

  it('continues after the highest node-N id when seeded', () => {
    nodeId.seedNodeIdCounter(['node-3', 'node-12', 'demo-client'])

    expect(nodeId.generateNodeId()).toBe('node-13')
  })

  it('keeps counting from the current value when no id matches', () => {
    nodeId.generateNodeId()
    nodeId.seedNodeIdCounter(['demo-client', 'node-x', 'edge-node-9'])

    expect(nodeId.generateNodeId()).toBe('node-2')
  })

  it('never moves the counter backwards', () => {
    nodeId.seedNodeIdCounter(['node-20'])
    nodeId.seedNodeIdCounter(['node-5'])

    expect(nodeId.generateNodeId()).toBe('node-21')
  })
})
