import { z } from 'zod'
import type { SystemParams } from '../types/topology'

export const WORKSPACE_VERSION = 1

const optionalNumber = z.number().optional().catch(undefined)
const optionalText = z.string().optional().catch(undefined)

export const paramsObjectSchema = z.object({
  dau: optionalNumber,
  peakQPS: optionalNumber,
  avgQPS: optionalNumber,
  storageGB: optionalNumber,
  dailyGrowthGB: optionalNumber,
  readWriteRatio: optionalNumber,
  latencyTarget: optionalText,
  availability: optionalText,
})

function withoutUndefined(params: z.infer<typeof paramsObjectSchema>): SystemParams {
  // Keys are limited to SystemParams by paramsObjectSchema, so the cast only narrows the value types.
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)) as SystemParams
}

export const paramsSchema = paramsObjectSchema.transform(withoutUndefined).catch({})

const nodeSchema = z.looseObject({
  id: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
})

const edgeSchema = z.looseObject({
  id: z.string(),
  source: z.string(),
  target: z.string(),
})

const tabSchema = z.object({
  id: z.string(),
  name: z.string(),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  params: paramsSchema,
})

export const workspaceSchema = z
  .object({
    version: z.literal(WORKSPACE_VERSION),
    activeTabId: z.string().catch(''),
    tabs: z.array(tabSchema).min(1),
  })
  .transform((workspace) => ({
    ...workspace,
    activeTabId: workspace.tabs.some((tab) => tab.id === workspace.activeTabId)
      ? workspace.activeTabId
      : workspace.tabs[0].id,
  }))

export type PersistedWorkspace = z.output<typeof workspaceSchema>
export type PersistedTab = PersistedWorkspace['tabs'][number]

export type VersionStatus = 'current' | 'newer' | 'invalid'

export function classifyVersion(candidate: unknown): VersionStatus {
  if (typeof candidate !== 'object' || candidate === null) return 'invalid'
  const { version } = candidate as { readonly version?: unknown }
  if (version === WORKSPACE_VERSION) return 'current'
  if (typeof version === 'number' && Number.isInteger(version) && version > WORKSPACE_VERSION) return 'newer'
  return 'invalid'
}
