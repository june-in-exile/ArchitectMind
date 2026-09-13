import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  canvasEdges,
  clickEdge,
  connectHandles,
  edgeById,
  loadPreset,
  mockAnalysis,
  nodeById,
  openApp,
} from './support/app'

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
  await loadPreset(page, 'Basic')
})

test('connecting two handles creates an edge', async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit',
    'Playwright WebKit does not complete React Flow handle drags from synthetic mouse events (edge count stays 13); the same drag creates the edge in Chromium',
  )
  await expect(canvasEdges(page)).toHaveCount(13)

  await connectHandles(page, 'demo-storage', 'bottom-source', 'demo-cache', 'top-target')

  await expect(canvasEdges(page)).toHaveCount(14)
  await expect(edgeById(page, 'edge-demo-storage-demo-cache')).toHaveCount(1)
})

test('editing a node label updates the canvas', async ({ page }) => {
  await nodeById(page, 'demo-service').click()
  await expect(page.getByText('Component Properties')).toBeVisible()

  await page.locator('label:text-is("Label") + input').fill('Order Service')

  await expect(nodeById(page, 'demo-service')).toContainText('Order Service')
})

test('edge protocol and connection type update the edge label and style', async ({ page }) => {
  await expect(page.getByText('DNS · sync', { exact: true })).toHaveCount(1)
  await expect(page.getByText('HTTP · sync', { exact: true })).toHaveCount(3)
  await expect(page.getByText('HTTP · async', { exact: true })).toHaveCount(1)

  await clickEdge(page, 'e-client-dns')
  await expect(page.getByText('Edge Properties')).toBeVisible()

  await page.locator('label:text-is("Protocol") + select').selectOption('http')
  await expect(page.getByText('DNS · sync', { exact: true })).toHaveCount(0)
  await expect(page.getByText('HTTP · sync', { exact: true })).toHaveCount(4)

  await page.locator('label:text-is("Connection Type") + select').selectOption('async')
  await expect(page.getByText('HTTP · async', { exact: true })).toHaveCount(2)
  await expect(edgeById(page, 'e-client-dns').locator('path.react-flow__edge-path')).toHaveAttribute(
    'style',
    /stroke-dasharray: 8,? ?6/,
  )
})

test('the edge label field does not render text on the canvas', async ({ page }) => {
  await clickEdge(page, 'e-client-dns')
  const labelInput = page.getByPlaceholder('Optional label')

  await labelInput.fill('resolves')

  await expect(labelInput).toHaveValue('resolves')
  await expect(page.locator('.react-flow__edgelabel-renderer').getByText('resolves')).toHaveCount(0)
})

test('system parameters panel shows the estimate and marks the button', async ({ page }) => {
  const paramsButton = page.getByRole('button', { name: 'Params' })
  await expect(paramsButton.locator('span')).toHaveCount(0)

  await paramsButton.click()
  await expect(page.getByText('System Parameters')).toBeVisible()
  await page.getByPlaceholder('e.g., 1000000').fill('1000000')
  await expect(page.getByText('💡 Estimated Peak QPS ≈ 116 (DAU/86400 × 10)')).toBeVisible()

  await page.getByRole('button', { name: '✕' }).click()
  await expect(page.getByText('System Parameters')).toHaveCount(0)
  await expect(paramsButton.locator('span')).toHaveCount(1)
})
