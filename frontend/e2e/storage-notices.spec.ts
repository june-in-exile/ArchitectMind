import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  WORKSPACE_STORAGE_KEY,
  canvasNodes,
  dropComponent,
  mockAnalysis,
  openApp,
  readStoredWorkspace,
} from './support/app'

const CORRUPT_BACKUP_KEY = 'architectmind:workspace:corrupt'
// Longer than the app's 500 ms save debounce.
const SAVE_SETTLE_MS = 1000

test('keeps working with a notice when the browser blocks local storage', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Access is denied for this document.', 'SecurityError')
      },
    })
  })
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)

  await expect(
    page.getByText("This browser is blocking local storage — changes won't be kept after you close the app."),
  ).toBeVisible()
  await dropComponent(page, 'service', 300, 200)
  await expect(canvasNodes(page)).toHaveCount(1)

  await page.getByRole('button', { name: 'Dismiss' }).click()

  await expect(page.getByText(/blocking local storage/)).toHaveCount(0)
})

test('starts a blank workspace and keeps a backup when the saved workspace is corrupt', async ({ page }) => {
  await page.addInitScript((key) => window.localStorage.setItem(key, '{not json'), WORKSPACE_STORAGE_KEY)
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)

  await expect(page.getByText("Your saved workspace couldn't be restored. A backup was kept in this browser.")).toBeVisible()
  await expect(canvasNodes(page)).toHaveCount(0)
  expect(await page.evaluate((key) => window.localStorage.getItem(key), CORRUPT_BACKUP_KEY)).toBe('{not json')

  await dropComponent(page, 'service', 300, 200)

  // The corrupt raw value still sits under WORKSPACE_STORAGE_KEY until the first debounced save
  // overwrites it; readStoredWorkspace's JSON.parse would throw on it, and expect.poll does not
  // retry when the polled callback itself throws (only when its assertion fails). Wait for the
  // debounced save to land before polling the parsed workspace.
  await expect
    .poll(() => page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY))
    .not.toBe('{not json')

  await expect.poll(async () => (await readStoredWorkspace(page))?.tabs[0].nodes.length).toBe(1)
})

test('never overwrites a workspace saved by a newer version', async ({ page }) => {
  const newer = JSON.stringify({ version: 2, activeTabId: 'future', tabs: [] })
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: WORKSPACE_STORAGE_KEY, value: newer },
  )
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)

  await expect(
    page.getByText(
      "This workspace was saved by a newer version of ArchitectMind. Reload to update — changes in this window won't be saved.",
    ),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible()
  await dropComponent(page, 'service', 300, 200)
  await expect(canvasNodes(page)).toHaveCount(1)
  await page.waitForTimeout(SAVE_SETTLE_MS)

  const stored = await page.evaluate(
    ({ key, backupKey }) => ({ main: window.localStorage.getItem(key), backup: window.localStorage.getItem(backupKey) }),
    { key: WORKSPACE_STORAGE_KEY, backupKey: CORRUPT_BACKUP_KEY },
  )
  expect(stored).toEqual({ main: newer, backup: null })
})
