import { expect, test, type Download, type Locator, type Page } from '@playwright/test'
import type { AnalysisFixture } from '../fixtures/analysis'

export const ANALYSIS_SETTLE_MS = 1500
const FIT_VIEW_START_MS = 100
const VIEWPORT_SAMPLE_GAP_MS = 150
// `serviceWorkers: 'block'` replaces navigator.serviceWorker.register with a Playwright
// stub that logs this warning; it comes from the test runner, not from the app.
const PLAYWRIGHT_SW_BLOCK_WARNING = 'Service Worker registration blocked by Playwright'

export const BACKEND_ERROR_SOLUTION = 'Please ensure the backend service is running and try again.'

export type PresetName = 'Basic' | 'Twitter' | 'YouTube' | 'Google'

export const PRESET_COUNTS: Readonly<Record<PresetName, { readonly nodes: number; readonly edges: number }>> = {
  Basic: { nodes: 14, edges: 13 },
  Twitter: { nodes: 18, edges: 22 },
  YouTube: { nodes: 19, edges: 27 },
  Google: { nodes: 19, edges: 20 },
}

export type ComponentTypeId =
  | 'client'
  | 'dns'
  | 'cdn'
  | 'firewall'
  | 'load_balancer'
  | 'reverse_proxy'
  | 'api_gateway'
  | 'service'
  | 'message_queue'
  | 'cache'
  | 'database'
  | 'storage'
  | 'logger'

export interface AnalysisRecorder {
  readonly requests: () => readonly Record<string, unknown>[]
}

export async function mockAnalysis(page: Page, response: AnalysisFixture): Promise<AnalysisRecorder> {
  let bodies: readonly Record<string, unknown>[] = []
  await page.context().route('**/api/topology', async (route) => {
    bodies = [...bodies, route.request().postDataJSON() as Record<string, unknown>]
    await route.fulfill({ json: response })
  })
  return { requests: () => bodies }
}

export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  if (test.info().project.use.serviceWorkers === 'allow') {
    await waitForServiceWorkerControl(page)
  }
  await expect(page.getByText('Untitled 1', { exact: true })).toBeVisible()
}

async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
}

export const canvasNodes = (page: Page): Locator => page.locator('.react-flow__node')
export const canvasEdges = (page: Page): Locator => page.locator('.react-flow__edge')
export const nodeById = (page: Page, id: string): Locator => page.locator(`.react-flow__node[data-id="${id}"]`)
export const edgeById = (page: Page, id: string): Locator => page.locator(`.react-flow__edge[data-id="${id}"]`)
export const analysisSummary = (page: Page): Locator => page.getByText(/^\d+ nodes, \d+ edges/)
export const sidebarItem = (page: Page, label: string): Locator =>
  page.locator('aside [draggable="true"]').filter({ has: page.getByText(label, { exact: true }) })

export async function nodeIds(page: Page): Promise<string[]> {
  return canvasNodes(page).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-id') ?? ''))
}

export function collectConsoleProblems(page: Page): () => readonly string[] {
  let problems: readonly string[] = []
  page.on('console', (message) => {
    const isProblem = message.type() === 'error' || message.type() === 'warning'
    if (isProblem && message.text() !== PLAYWRIGHT_SW_BLOCK_WARNING) {
      problems = [...problems, `${message.type()}: ${message.text()}`]
    }
  })
  page.on('pageerror', (error) => {
    problems = [...problems, `pageerror: ${error.message}`]
  })
  return () => problems
}

export async function waitForViewportToSettle(page: Page): Promise<void> {
  const viewport = page.locator('.react-flow__viewport')
  await page.waitForTimeout(FIT_VIEW_START_MS)
  await expect
    .poll(async () => {
      const first = await viewport.getAttribute('style')
      await page.waitForTimeout(VIEWPORT_SAMPLE_GAP_MS)
      return first === (await viewport.getAttribute('style'))
    })
    .toBe(true)
}

export async function settleForScreenshot(page: Page): Promise<void> {
  await page.mouse.move(0, 0)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

export async function loadPreset(page: Page, name: PresetName): Promise<void> {
  await page.getByRole('button', { name: 'Demo ▾' }).click()
  await page.getByRole('button', { name, exact: true }).click()
  await expect(canvasNodes(page)).toHaveCount(PRESET_COUNTS[name].nodes)
  await waitForViewportToSettle(page)
}

export async function dropComponent(page: Page, type: ComponentTypeId, x: number, y: number): Promise<void> {
  const pane = page.locator('.react-flow__pane')
  const box = await pane.boundingBox()
  if (!box) throw new Error('React Flow pane is not visible')
  const dataTransfer = await page.evaluateHandle((componentType) => {
    const transfer = new DataTransfer()
    transfer.setData('application/architectmind', componentType)
    return transfer
  }, type)
  const init = { dataTransfer, clientX: box.x + x, clientY: box.y + y }
  await pane.dispatchEvent('dragover', init)
  await pane.dispatchEvent('drop', init)
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element has no bounding box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export async function clickEmptyCanvas(page: Page): Promise<void> {
  const box = await page.locator('.react-flow__pane').boundingBox()
  if (!box) throw new Error('React Flow pane is not visible')
  await page.mouse.click(box.x + 24, box.y + 24)
}

export async function clickEdge(page: Page, id: string): Promise<void> {
  const { x, y } = await centerOf(edgeById(page, id))
  await page.mouse.click(x, y)
}

export async function dragWithShift(page: Page, locator: Locator, dx: number, dy: number): Promise<void> {
  const { x, y } = await centerOf(locator)
  await page.keyboard.down('Shift')
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 8 })
  await page.mouse.up()
  await page.keyboard.up('Shift')
}

export async function connectHandles(
  page: Page,
  sourceNodeId: string,
  sourceHandle: string,
  targetNodeId: string,
  targetHandle: string,
): Promise<void> {
  const handle = (nodeId: string, handleId: string) =>
    nodeById(page, nodeId).locator(`.react-flow__handle[data-handleid="${handleId}"]`)
  const from = await centerOf(handle(sourceNodeId, sourceHandle))
  const to = await centerOf(handle(targetNodeId, targetHandle))
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()
}

export async function exportAs(page: Page, label: string): Promise<Download> {
  await page.getByTitle('Settings').click()
  await page.getByRole('button', { name: /^Export/ }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: label, exact: true }).click(),
  ])
  return download
}

export async function downloadedFilePath(download: Download): Promise<string> {
  const path = await download.path()
  if (!path) throw new Error(`Download failed: ${download.suggestedFilename()}`)
  return path
}

export async function isHandFontLoaded(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].some(
      (face) => face.family.replace(/["']/g, '') === 'Caveat Variable' && face.status === 'loaded',
    )
  })
}
