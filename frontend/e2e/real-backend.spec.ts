import { expect, test } from '@playwright/test'
import { analysisSummary, loadPreset, openApp } from './support/app'

test('analyzes the Basic preset with the Go backend', async ({ page }) => {
  await openApp(page)
  const response = page.waitForResponse(
    (res) => res.url().endsWith('/api/topology') && res.request().method() === 'POST',
  )

  await loadPreset(page, 'Basic')

  expect((await response).status()).toBe(200)
  await expect(analysisSummary(page)).toBeVisible()
  await expect(page.getByText('rules passed')).toBeVisible()
  await expect(page.getByText('Analysis failed')).toHaveCount(0)
})
