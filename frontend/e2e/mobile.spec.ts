import { expect, test, type Page } from '@playwright/test'
import { cleanAnalysis, warningAnalysis } from './fixtures/analysis'
import { canvasNodes, mockAnalysis, nodeById, openApp, storedNodeCounts } from './support/app'

const PANE = '.react-flow__pane'

async function addComponent(page: Page, label: string, at: { x: number; y: number }): Promise<void> {
  await page.getByRole('button', { name: 'Add component' }).tap()
  await page.getByRole('button', { name: label }).tap()
  await page.locator(PANE).tap({ position: at })
}

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
})

test('hides the desktop sidebar and offers an add button', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Add component' })).toBeVisible()
  await expect(page.getByText('Components', { exact: true })).toHaveCount(0)
})

test('places a component where the canvas is tapped', async ({ page }) => {
  await addComponent(page, 'Client', { x: 140, y: 240 })

  await expect(canvasNodes(page)).toHaveCount(1)
  await expect(page.getByRole('dialog', { name: 'Components' })).toHaveCount(0)
})

test('cancels a pending component when it is tapped again', async ({ page }) => {
  await page.getByRole('button', { name: 'Add component' }).tap()
  const tile = page.getByRole('button', { name: 'Client' })
  await tile.tap()
  await expect(tile).toHaveAttribute('aria-pressed', 'true')

  await tile.tap()
  await expect(tile).toHaveAttribute('aria-pressed', 'false')
  await page.locator(PANE).tap({ position: { x: 140, y: 120 } })

  await expect(canvasNodes(page)).toHaveCount(0)
})

test('edits a label from the property sheet', async ({ page }) => {
  await addComponent(page, 'Service', { x: 160, y: 200 })

  await nodeById(page, 'node-1').tap()
  await expect(page.getByRole('dialog', { name: 'Properties' })).toBeVisible()
  await page.locator('label:text-is("Label") + input').fill('Order Service')

  await expect(nodeById(page, 'node-1')).toContainText('Order Service')
})

test('deletes a component from the property sheet', async ({ page }) => {
  await addComponent(page, 'Service', { x: 160, y: 200 })
  await nodeById(page, 'node-1').tap()

  await page.getByRole('button', { name: 'Delete component' }).tap()

  await expect(canvasNodes(page)).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Properties' })).toHaveCount(0)
})

test('closes the property sheet when the canvas is tapped', async ({ page }) => {
  await addComponent(page, 'Service', { x: 160, y: 200 })
  await nodeById(page, 'node-1').tap()
  await expect(page.getByRole('dialog', { name: 'Properties' })).toBeVisible()

  await page.locator(PANE).tap({ position: { x: 40, y: 80 } })

  await expect(page.getByRole('dialog', { name: 'Properties' })).toHaveCount(0)
})

test('shows analysis warnings in a sheet', async ({ page }) => {
  await mockAnalysis(page, warningAnalysis)
  await page.reload()
  await addComponent(page, 'Service', { x: 160, y: 200 })

  await expect(page.getByText(/\d+ warning\(s\)/)).toBeVisible()
  await page.getByText(/\d+ warning\(s\)/).tap()

  await expect(page.getByRole('dialog', { name: 'Warnings' })).toBeVisible()
})

test('switches canvases from the tab bar', async ({ page }) => {
  await addComponent(page, 'Service', { x: 160, y: 200 })
  await expect(canvasNodes(page)).toHaveCount(1)

  await page.getByTitle('New canvas').tap()
  await expect(canvasNodes(page)).toHaveCount(0)

  await page.getByText('Untitled 1', { exact: true }).tap()
  await expect(canvasNodes(page)).toHaveCount(1)
})

test('restores the canvas after a reload', async ({ page }) => {
  await addComponent(page, 'Database', { x: 160, y: 220 })
  await expect.poll(() => storedNodeCounts(page)).toEqual([1])

  await page.reload()

  await expect(canvasNodes(page)).toHaveCount(1)
})
