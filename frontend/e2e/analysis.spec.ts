import { expect, test } from '@playwright/test'
import { cleanAnalysis, warningAnalysis } from './fixtures/analysis'
import {
  ANALYSIS_SETTLE_MS,
  BACKEND_ERROR_SOLUTION,
  analysisSummary,
  canvasNodes,
  clickEmptyCanvas,
  dropComponent,
  loadPreset,
  mockAnalysis,
  openApp,
} from './support/app'

const WARNING_MESSAGE = 'Services behind the load balancer have no health check.'

test.describe('auto analysis', () => {
  test('debounces rapid changes into a single request', async ({ page }) => {
    const recorder = await mockAnalysis(page, cleanAnalysis)
    await openApp(page)

    await dropComponent(page, 'service', 300, 150)
    await dropComponent(page, 'database', 300, 450)
    await dropComponent(page, 'cache', 650, 450)
    await expect(canvasNodes(page)).toHaveCount(3)

    await page.waitForTimeout(ANALYSIS_SETTLE_MS)
    expect(recorder.requests()).toHaveLength(1)
  })

  test('sends the Basic preset topology in the existing request format', async ({ page }) => {
    const recorder = await mockAnalysis(page, cleanAnalysis)
    await openApp(page)

    await loadPreset(page, 'Basic')

    await expect.poll(() => recorder.requests().length).toBe(1)
    expect(JSON.stringify(recorder.requests()[0], null, 2)).toMatchSnapshot('basic-preset-request.json')
  })

  test('includes system parameters in the request once they are set', async ({ page }) => {
    const recorder = await mockAnalysis(page, cleanAnalysis)
    await openApp(page)
    await loadPreset(page, 'Basic')
    await expect.poll(() => recorder.requests().length).toBe(1)
    expect(recorder.requests()[0]).not.toHaveProperty('params')

    await page.getByRole('button', { name: 'Params' }).click()
    await page.getByPlaceholder('e.g., 1000000').fill('1000000')

    await expect.poll(() => recorder.requests().length).toBe(2)
    expect(recorder.requests()[1]).toHaveProperty('params', { dau: 1000000 })
  })

  test('shows the summary, badge and warnings from the response', async ({ page }) => {
    await mockAnalysis(page, warningAnalysis)
    await openApp(page)

    await loadPreset(page, 'Basic')

    await expect(page.getByText('14 nodes, 13 edges')).toBeVisible()
    await expect(page.getByText('1 warning(s)')).toBeVisible()
    await expect(page.getByText('PROBLEMS')).toBeVisible()
    await expect(page.getByText(WARNING_MESSAGE)).toBeVisible()
    await expect(page.getByText('[no healthcheck behind lb]')).toBeVisible()
    await expect(page.getByText('Nodes: demo-service')).toBeVisible()
    await expect(page.getByText('44/45')).toBeVisible()
    await expect(page.getByText('rules passed')).toBeVisible()
  })

  test('clicking a warning focuses the canvas on its node', async ({ page }) => {
    await mockAnalysis(page, warningAnalysis)
    await openApp(page)
    await loadPreset(page, 'Basic')
    const message = page.getByText(WARNING_MESSAGE)
    await expect(message).toBeVisible()
    const viewport = page.locator('.react-flow__viewport')
    const before = await viewport.getAttribute('style')

    await message.click()

    await expect.poll(() => viewport.getAttribute('style')).not.toBe(before)
    await expect(page.getByText('Component Properties')).toBeVisible()
    await expect(page.locator('label:text-is("Label") + input')).toHaveValue('Service')
  })

  test('clears the results after every node is deleted', async ({ page }) => {
    await mockAnalysis(page, warningAnalysis)
    await openApp(page)
    await loadPreset(page, 'Basic')
    await expect(page.getByText('rules passed')).toBeVisible()

    await clickEmptyCanvas(page)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Backspace')

    await expect(canvasNodes(page)).toHaveCount(0)
    await expect(analysisSummary(page)).toHaveCount(0)
    await expect(page.getByText('rules passed')).toHaveCount(0)
    await expect(page.getByText('PROBLEMS')).toHaveCount(0)
  })
})

test.describe('backend errors', () => {
  test('shows the error message when the API returns 500', async ({ page }) => {
    await page.context().route('**/api/topology', (route) => route.fulfill({ status: 500, json: { error: 'Internal failure' } }))
    await openApp(page)

    await loadPreset(page, 'Basic')

    await expect(page.getByText('Analysis failed')).toBeVisible()
    await expect(page.getByText('Internal failure')).toBeVisible()
    await expect(page.getByText(BACKEND_ERROR_SOLUTION)).toBeVisible()
  })

  test('shows the error message when the connection fails', async ({ page }) => {
    await page.context().route('**/api/topology', (route) => route.abort('connectionrefused'))
    await openApp(page)

    await loadPreset(page, 'Basic')

    await expect(page.getByText('Analysis failed')).toBeVisible()
    await expect(page.getByText(BACKEND_ERROR_SOLUTION)).toBeVisible()
  })
})
