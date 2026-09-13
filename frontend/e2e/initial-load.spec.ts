import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { ANALYSIS_SETTLE_MS, canvasNodes, collectConsoleProblems, mockAnalysis, openApp } from './support/app'

test.describe('initial load', () => {
  test('shows a single empty canvas with the sidebar open', async ({ page }) => {
    const consoleProblems = collectConsoleProblems(page)
    const recorder = await mockAnalysis(page, cleanAnalysis)

    await openApp(page)

    await expect(page).toHaveTitle('ArchitectMind - System Design Visualizer')
    await expect(page.getByText(/^Untitled \d+$/)).toHaveCount(1)
    await expect(page.getByTitle('Close tab')).toHaveCount(0)
    await expect(canvasNodes(page)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Components' })).toBeVisible()
    await expect(page.getByTitle('Close sidebar')).toBeVisible()
    await expect(page.getByText('Select a component to view properties')).toBeVisible()
    await expect(page.getByText('rules passed')).toHaveCount(0)

    await page.waitForTimeout(ANALYSIS_SETTLE_MS)
    expect(recorder.requests()).toHaveLength(0)
    expect(consoleProblems()).toEqual([])
  })

  test('shows no update prompt, storage warning or offline notice', async ({ page }) => {
    await mockAnalysis(page, cleanAnalysis)
    await openApp(page)

    await expect(page.getByText(/new version|offline|couldn't be saved|blocking local storage/i)).toHaveCount(0)
  })
})
