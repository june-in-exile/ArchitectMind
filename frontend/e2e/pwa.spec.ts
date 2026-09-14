import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { mockAnalysis, openApp } from './support/app'

const GOOGLE_FONTS_HOSTS = /fonts\.(googleapis|gstatic)\.com/
const HAND_FONT_FAMILY = 'Caveat Variable'

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
})

test('serves an installable web app manifest', async ({ page }) => {
  await openApp(page)
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).not.toBeNull()

  const response = await page.request.get(new URL(href ?? '', page.url()).toString())
  expect(response.ok()).toBe(true)
  const manifest = await response.json()

  expect(manifest).toMatchObject({
    id: '/',
    name: 'ArchitectMind - System Design Visualizer',
    short_name: 'ArchitectMind',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#fafaf8',
    background_color: '#fafaf8',
  })
  expect(manifest.icons).toEqual([
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ])
})

test('declares theme color, description and apple touch icon', async ({ page }) => {
  await openApp(page)

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#fafaf8')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Visualize and validate system design architectures.',
  )
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon-180x180.png')
  const icon = await page.request.get('/apple-touch-icon-180x180.png')
  expect(icon.ok()).toBe(true)
})

test('self-hosts the hand-drawn font', async ({ page }) => {
  let googleFontRequests: readonly string[] = []
  page.on('request', (request) => {
    if (GOOGLE_FONTS_HOSTS.test(request.url())) {
      googleFontRequests = [...googleFontRequests, request.url()]
    }
  })

  await openApp(page)
  const handFontLoaded = await page.evaluate(async (family) => {
    await document.fonts.ready
    return [...document.fonts].some(
      (face) => face.family.replace(/["']/g, '') === family && face.status === 'loaded',
    )
  }, HAND_FONT_FAMILY)

  expect(handFontLoaded).toBe(true)
  expect(googleFontRequests).toEqual([])
})
