import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { loadPreset, mockAnalysis, openApp, settleForScreenshot } from './support/app'

const THEMES = ['light', 'dark'] as const

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme)
      await mockAnalysis(page, cleanAnalysis)
      await openApp(page)
    })

    test('empty canvas', async ({ page }) => {
      await settleForScreenshot(page)

      await expect(page).toHaveScreenshot(`empty-canvas-${theme}.png`)
    })

    test('Basic preset', async ({ page }) => {
      await loadPreset(page, 'Basic')
      await expect(page.getByText('45/45')).toBeVisible()
      await settleForScreenshot(page)

      await expect(page).toHaveScreenshot(`basic-preset-${theme}.png`)
    })

    test('system parameters panel', async ({ page }) => {
      await page.getByRole('button', { name: 'Params' }).click()
      await expect(page.getByText('System Parameters')).toBeVisible()
      await settleForScreenshot(page)

      await expect(page).toHaveScreenshot(`params-panel-${theme}.png`)
    })
  })
}
