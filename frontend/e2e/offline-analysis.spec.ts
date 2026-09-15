import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { ANALYSIS_SETTLE_MS, canvasNodes, dropComponent, loadPreset, mockAnalysis, openApp } from './support/app'

const OFFLINE_NOTICE = 'Offline — analysis paused. Results may be outdated. Changes are saved locally.'

test('pauses analysis while offline and resumes when the connection returns', async ({ page, context }) => {
  const recorder = await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
  await loadPreset(page, 'Basic')
  await expect(page.getByText('45/45')).toBeVisible()
  const requestsBeforeOffline = recorder.requests().length

  await context.setOffline(true)
  await dropComponent(page, 'service', 700, 120)
  await expect(canvasNodes(page)).toHaveCount(15)

  await expect(page.getByText(OFFLINE_NOTICE)).toBeVisible()
  await expect(page.getByText('45/45')).toBeVisible()
  await expect(page.getByText(/Analysis failed/)).toHaveCount(0)
  await page.waitForTimeout(ANALYSIS_SETTLE_MS)
  expect(recorder.requests()).toHaveLength(requestsBeforeOffline)

  await context.setOffline(false)

  await expect.poll(() => recorder.requests().length).toBe(requestsBeforeOffline + 1)
  await expect(page.getByText(OFFLINE_NOTICE)).toHaveCount(0)
})
