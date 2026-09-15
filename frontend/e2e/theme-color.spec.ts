import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { mockAnalysis, openApp } from './support/app'

test('updates the theme-color meta tag with the theme', async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
  const themeColor = page.locator('meta[name="theme-color"]')
  await expect(themeColor).toHaveAttribute('content', '#fafaf8')

  await page.getByTitle('Settings').click()
  await page.getByRole('button', { name: 'Theme (Light)' }).click()
  await page.getByRole('button', { name: 'Dark Mode' }).click()
  await expect(themeColor).toHaveAttribute('content', '#1e1e1e')
  await page.getByRole('button', { name: 'Warm Mode' }).click()
  await expect(themeColor).toHaveAttribute('content', '#EBE4D1')
  await page.getByRole('button', { name: 'CyberPunk Mode' }).click()

  await expect(themeColor).toHaveAttribute('content', '#0a0a0c')
})

test('applies the saved theme color on load', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('theme', 'dream'))
  await mockAnalysis(page, cleanAnalysis)

  await openApp(page)

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F5F3FF')
})
