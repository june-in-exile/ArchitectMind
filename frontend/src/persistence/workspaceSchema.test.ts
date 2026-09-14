import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import type { SystemParams } from '../types/topology'
import { classifyVersion, paramsObjectSchema, paramsSchema, workspaceSchema } from './workspaceSchema'

type Defined<T> = { [K in keyof T]-?: Exclude<T[K], undefined> }
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

const validWorkspace = {
  version: 1,
  activeTabId: 'tab-2',
  tabs: [
    {
      id: 'tab-1',
      name: 'Untitled 1',
      nodes: [
        {
          id: 'node-1',
          type: 'architecture',
          width: 160,
          position: { x: 10, y: 20 },
          data: { label: 'Client', componentType: 'client', properties: {} },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          sourceHandle: 'right-source',
          type: 'handdrawn',
          style: { strokeWidth: 2 },
          data: { protocol: 'http' },
        },
      ],
      params: { dau: 1000000, availability: '99.9%' },
    },
    { id: 'tab-2', name: 'Untitled 2', nodes: [], edges: [], params: {} },
  ],
}

describe('workspaceSchema', () => {
  it('accepts a valid workspace and keeps unknown node and edge fields', () => {
    const result = workspaceSchema.safeParse(validWorkspace)

    expect(result.success).toBe(true)
    expect(result.data?.activeTabId).toBe('tab-2')
    expect(result.data?.tabs[0].nodes[0]).toMatchObject({ type: 'architecture', width: 160 })
    expect(result.data?.tabs[0].edges[0]).toMatchObject({
      sourceHandle: 'right-source',
      type: 'handdrawn',
      style: { strokeWidth: 2 },
    })
    expect(result.data?.tabs[0].params).toEqual({ dau: 1000000, availability: '99.9%' })
  })

  it('rejects a workspace without tabs', () => {
    expect(workspaceSchema.safeParse({ ...validWorkspace, tabs: [] }).success).toBe(false)
    expect(workspaceSchema.safeParse({ version: 1, activeTabId: 'tab-1' }).success).toBe(false)
  })

  it('rejects a node without a position', () => {
    const tab = { id: 'tab-1', name: 'Untitled 1', nodes: [{ id: 'node-1', data: {} }], edges: [], params: {} }

    expect(workspaceSchema.safeParse({ version: 1, activeTabId: 'tab-1', tabs: [tab] }).success).toBe(false)
  })

  it('drops invalid params and keeps valid ones', () => {
    const stored = JSON.parse(
      JSON.stringify({ dau: 500, readWriteRatio: Number.NaN, peakQPS: 'fast', latencyTarget: 42, availability: '99.99%' }),
    )

    expect(paramsSchema.parse(stored)).toEqual({ dau: 500, availability: '99.99%' })
    expect(
      paramsSchema.parse({ avgQPS: Number.NaN, storageGB: Number.POSITIVE_INFINITY, dailyGrowthGB: 3 }),
    ).toEqual({ dailyGrowthGB: 3 })
  })

  it('defaults missing or malformed params to an empty object', () => {
    expect(paramsSchema.parse(undefined)).toEqual({})
    expect(paramsSchema.parse('not an object')).toEqual({})
  })

  it('falls back to the first tab when activeTabId does not exist', () => {
    const result = workspaceSchema.parse({ ...validWorkspace, activeTabId: 'missing' })

    expect(result.activeTabId).toBe('tab-1')
  })

  it('classifies stored versions', () => {
    expect(classifyVersion({ version: 1 })).toBe('current')
    expect(classifyVersion({ version: 2 })).toBe('newer')
    expect(classifyVersion({ version: 0 })).toBe('invalid')
    expect(classifyVersion({ version: '1' })).toBe('invalid')
    expect(classifyVersion({ version: 1.5 })).toBe('invalid')
    expect(classifyVersion({})).toBe('invalid')
    expect(classifyVersion(null)).toBe('invalid')
  })

  it('keeps the params schema fields in sync with SystemParams', () => {
    const sameShape: Same<Defined<z.infer<typeof paramsObjectSchema>>, Defined<SystemParams>> = true

    expect(sameShape).toBe(true)
    expect(Object.keys(paramsObjectSchema.shape).sort()).toEqual([
      'availability',
      'avgQPS',
      'dailyGrowthGB',
      'dau',
      'latencyTarget',
      'peakQPS',
      'readWriteRatio',
      'storageGB',
    ])
  })
})
