import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { isHandFontLoaded, mockAnalysis, openApp } from './support/app'

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
})

test('a service worker controls the app after the first visit', async ({ page }) => {
  await openApp(page)

  const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null)

  expect(controlled).toBe(true)
})

test('reloads offline with the hand-drawn font', async ({ page, context }) => {
  await openApp(page)
  await context.setOffline(true)

  await page.reload()

  await expect(page.getByText('Untitled 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Components' })).toBeVisible()
  expect(await isHandFontLoaded(page)).toBe(true)
  await context.setOffline(false)
})
