import { expect, test, type Page } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  SHORTCUT_REBIND_MS,
  canvasEdges,
  canvasNodes,
  dropComponent,
  loadPreset,
  mockAnalysis,
  nodeById,
  nodeIds,
  openApp,
  readDau,
  setDau,
  storedNodeCounts,
} from './support/app'

async function deleteAndUndoLogger(page: Page): Promise<void> {
  await nodeById(page, 'demo-logger').click()
  await page.keyboard.press('Backspace')
  await expect(canvasNodes(page)).toHaveCount(13)
  await page.waitForTimeout(SHORTCUT_REBIND_MS)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvasNodes(page)).toHaveCount(14)
}

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
})

test('restores tabs, canvas content, params and the active tab after a reload', async ({ page }) => {
  await loadPreset(page, 'Basic')
  await setDau(page, '1000000')
  await page.getByTitle('New canvas').click()
  await dropComponent(page, 'client', 300, 200)
  await expect(canvasNodes(page)).toHaveCount(1)
  await page.getByText('Untitled 1', { exact: true }).click()
  await expect(canvasNodes(page)).toHaveCount(14)
  await expect.poll(() => storedNodeCounts(page)).toEqual([14, 1])

  await page.reload()

  await expect(page.getByText('Untitled 2', { exact: true })).toBeVisible()
  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(canvasEdges(page)).toHaveCount(13)
  expect(await readDau(page)).toBe('1000000')
  await page.getByText('Untitled 2', { exact: true }).click()
  await expect(canvasNodes(page)).toHaveCount(1)
})

test('keeps new node ids unique after a reload', async ({ page }) => {
  await dropComponent(page, 'service', 300, 150)
  await dropComponent(page, 'database', 300, 450)
  await expect(canvasNodes(page)).toHaveCount(2)
  await expect.poll(() => storedNodeCounts(page)).toEqual([2])

  await page.reload()
  await expect(canvasNodes(page)).toHaveCount(2)
  await dropComponent(page, 'cache', 650, 450)

  await expect(canvasNodes(page)).toHaveCount(3)
  const ids = await nodeIds(page)
  expect(new Set(ids).size).toBe(3)
  expect(ids).toContain('node-3')
})

test('keeps system parameters when switching tabs', async ({ page }) => {
  await setDau(page, '5000')

  await page.getByTitle('New canvas').click()
  await page.getByText('Untitled 1', { exact: true }).click()

  await expect(page.getByRole('button', { name: 'Params' }).locator('span')).toHaveCount(1)
  expect(await readDau(page)).toBe('5000')
})

test('keeps the undo result after a reload', async ({ page }) => {
  await loadPreset(page, 'Basic')
  await deleteAndUndoLogger(page)
  await expect.poll(() => storedNodeCounts(page)).toEqual([14])

  await page.reload()

  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(nodeById(page, 'demo-logger')).toHaveCount(1)
})

test('keeps the undo result after switching tabs', async ({ page }) => {
  await loadPreset(page, 'Basic')
  await deleteAndUndoLogger(page)

  await page.getByTitle('New canvas').click()
  await page.getByText('Untitled 1', { exact: true }).click()

  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(nodeById(page, 'demo-logger')).toHaveCount(1)
})

test('only a window with changes writes the workspace', async ({ page, context }) => {
  const other = await context.newPage()
  await openApp(other)
  await dropComponent(other, 'service', 300, 200)
  await expect.poll(() => storedNodeCounts(other)).toEqual([1])

  await other.goto('about:blank')
  await page.goto('about:blank')

  const reader = await context.newPage()
  await openApp(reader)
  await expect(canvasNodes(reader)).toHaveCount(1)
})
