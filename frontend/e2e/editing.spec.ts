import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  canvasEdges,
  canvasNodes,
  clickEmptyCanvas,
  dragWithShift,
  edgeById,
  loadPreset,
  mockAnalysis,
  nodeById,
  openApp,
} from './support/app'

// Keyboard shortcuts are handled by a window-level keydown listener that React
// re-binds only after it re-renders with the latest selection, clipboard and
// history state. Pressing a shortcut before that re-bind reads stale state, so
// wait for it after every state change that a following shortcut depends on.
const SHORTCUT_REBIND_MS = 500

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
  await loadPreset(page, 'Basic')
})

test('shift+drag duplicates the dragged node', async ({ page }) => {
  await dragWithShift(page, nodeById(page, 'demo-cache'), 48, 48)

  await expect(canvasNodes(page)).toHaveCount(15)
  await expect(nodeById(page, 'demo-cache')).toHaveCount(1)
  await expect(nodeById(page, 'node-1')).toContainText('Cache')
})

test('copy and paste duplicates the selected node', async ({ page }) => {
  await nodeById(page, 'demo-storage').click()
  await expect(nodeById(page, 'demo-storage')).toHaveClass(/selected/)
  await page.waitForTimeout(SHORTCUT_REBIND_MS)

  await page.keyboard.press('ControlOrMeta+c')
  await page.waitForTimeout(SHORTCUT_REBIND_MS)
  await page.keyboard.press('ControlOrMeta+v')

  await expect(canvasNodes(page)).toHaveCount(15)
  await expect(nodeById(page, 'node-1')).toContainText('Storage')
})

test('undo removes a pasted node', async ({ page }) => {
  await nodeById(page, 'demo-storage').click()
  await expect(nodeById(page, 'demo-storage')).toHaveClass(/selected/)
  await page.waitForTimeout(SHORTCUT_REBIND_MS)
  await page.keyboard.press('ControlOrMeta+c')
  await page.waitForTimeout(SHORTCUT_REBIND_MS)
  await page.keyboard.press('ControlOrMeta+v')
  await expect(canvasNodes(page)).toHaveCount(15)
  await page.waitForTimeout(SHORTCUT_REBIND_MS)

  await page.keyboard.press('ControlOrMeta+z')

  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(nodeById(page, 'node-1')).toHaveCount(0)
})

test('undo and redo revert and reapply a label edit', async ({ page }) => {
  const service = nodeById(page, 'demo-service')
  await service.click()
  await page.locator('label:text-is("Label") + input').fill('Order Service')
  await expect(service).toContainText('Order Service')
  await clickEmptyCanvas(page)
  await expect(page.getByText('Select a component to view properties')).toBeVisible()
  await page.waitForTimeout(SHORTCUT_REBIND_MS)

  await page.keyboard.press('ControlOrMeta+z')
  await expect(service).not.toContainText('Order Service')
  await expect(canvasNodes(page)).toHaveCount(14)
  await page.waitForTimeout(SHORTCUT_REBIND_MS)

  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(service).toContainText('Order Service')
})

test('select all selects every node', async ({ page }) => {
  await clickEmptyCanvas(page)

  await page.keyboard.press('ControlOrMeta+a')

  await expect(page.locator('.react-flow__node.selected')).toHaveCount(14)
})

test('merge and split through the toolbar buttons', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Merge' })).toHaveCount(0)

  await nodeById(page, 'demo-service').click()
  await nodeById(page, 'demo-mq').click({ modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Merge' }).click()

  await expect(canvasNodes(page)).toHaveCount(13)
  await expect(nodeById(page, 'demo-mq')).toHaveCount(0)
  await expect(nodeById(page, 'demo-service')).toContainText(/Service\s*\+\s*Message Queue/)

  await page.getByRole('button', { name: 'Split' }).click()

  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(nodeById(page, 'demo-mq')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Split' })).toHaveCount(0)
})

test('Ctrl+M merges two selected nodes and undo restores them', async ({ page }) => {
  await nodeById(page, 'demo-service').click()
  await nodeById(page, 'demo-mq').click({ modifiers: ['Shift'] })
  await expect(page.getByRole('button', { name: 'Merge' })).toBeVisible()
  await page.waitForTimeout(SHORTCUT_REBIND_MS)

  await page.keyboard.press('Control+m')
  await expect(canvasNodes(page)).toHaveCount(13)
  await page.waitForTimeout(SHORTCUT_REBIND_MS)

  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvasNodes(page)).toHaveCount(14)
})

test('Backspace deletes the selected node and its edges', async ({ page }) => {
  await nodeById(page, 'demo-monitor').click()

  await page.keyboard.press('Backspace')

  await expect(canvasNodes(page)).toHaveCount(13)
  await expect(nodeById(page, 'demo-monitor')).toHaveCount(0)
  await expect(edgeById(page, 'e-service-monitor')).toHaveCount(0)
  await expect(canvasEdges(page)).toHaveCount(12)
})
