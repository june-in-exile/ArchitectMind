import { readFile, stat } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  PRESET_COUNTS,
  canvasEdges,
  canvasNodes,
  downloadedFilePath,
  exportAs,
  loadPreset,
  mockAnalysis,
  openApp,
  type PresetName,
} from './support/app'

const PRESETS: readonly PresetName[] = ['Basic', 'Twitter', 'YouTube', 'Google']

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
})

test.describe('presets', () => {
  for (const preset of PRESETS) {
    test(`${preset} loads ${PRESET_COUNTS[preset].nodes} nodes and ${PRESET_COUNTS[preset].edges} edges`, async ({
      page,
    }) => {
      await loadPreset(page, preset)

      await expect(canvasNodes(page)).toHaveCount(PRESET_COUNTS[preset].nodes)
      await expect(canvasEdges(page)).toHaveCount(PRESET_COUNTS[preset].edges)
    })
  }
})

test.describe('exports', () => {
  test.beforeEach(async ({ page }) => {
    await loadPreset(page, 'Basic')
  })

  test('Mermaid export downloads the Basic preset diagram', async ({ page }) => {
    const download = await exportAs(page, 'Mermaid (.mmd)')

    expect(download.suggestedFilename()).toBe('architecture.mmd')
    await expect(page.getByText('Downloaded .mmd')).toBeVisible()
    expect(await readFile(await downloadedFilePath(download), 'utf8')).toMatchSnapshot('basic-preset.mmd')
  })

  test('Excalidraw export downloads the Basic preset diagram', async ({ page }) => {
    const download = await exportAs(page, 'Excalidraw (.excalidraw)')

    expect(download.suggestedFilename()).toBe('architecture.excalidraw')
    await expect(page.getByText('Downloaded .excalidraw')).toBeVisible()
    expect(await readFile(await downloadedFilePath(download), 'utf8')).toMatchSnapshot('basic-preset.excalidraw')
  })

  test('PNG export downloads an image', async ({ page }) => {
    const download = await exportAs(page, 'PNG Image')

    expect(download.suggestedFilename()).toBe('architecture.png')
    await expect(page.getByText('PNG exported')).toBeVisible()
    expect((await stat(await downloadedFilePath(download))).size).toBeGreaterThan(0)
  })

  test('PDF export downloads a document', async ({ page }) => {
    const download = await exportAs(page, 'PDF Document')

    expect(download.suggestedFilename()).toBe('architecture.pdf')
    await expect(page.getByText('PDF exported')).toBeVisible()
    expect((await stat(await downloadedFilePath(download))).size).toBeGreaterThan(0)
  })
})
