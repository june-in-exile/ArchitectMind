import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { analysisSummary, loadPreset, mockAnalysis, openApp, settleForScreenshot } from './support/app'

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
})

test('empty canvas', async ({ page }) => {
  await settleForScreenshot(page)

  await expect(page).toHaveScreenshot('mobile-empty-canvas.png')
})

test('Basic preset', async ({ page }) => {
  await loadPreset(page, 'Basic')
  await expect(analysisSummary(page)).toBeVisible()
  await settleForScreenshot(page)

  await expect(page).toHaveScreenshot('mobile-basic-preset.png')
})

test('component drawer with a pending selection', async ({ page }) => {
  await page.getByRole('button', { name: 'Add component' }).tap()
  await expect(page.getByRole('dialog', { name: 'Components' })).toBeVisible()
  await page.getByRole('button', { name: 'Database' }).tap()
  await settleForScreenshot(page)

  await expect(page).toHaveScreenshot('mobile-component-drawer.png')
})
