import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  canvasEdges,
  canvasNodes,
  clickEmptyCanvas,
  dropComponent,
  loadPreset,
  mockAnalysis,
  nodeIds,
  openApp,
  sidebarItem,
} from './support/app'

const SIDEBAR_COMPONENTS = [
  'Client',
  'DNS',
  'CDN',
  'Firewall',
  'Load Balancer',
  'Reverse Proxy',
  'API Gateway',
  'Service',
  'Message Queue',
  'Cache',
  'Database',
  'Storage',
  'Monitor',
  'External System',
  'Worker',
  'Search Engine',
]

const THEMES = [
  { mode: 'Dark Mode', className: 'dark' },
  { mode: 'Warm Mode', className: 'warm' },
  { mode: 'Dream Mode', className: 'dream' },
  { mode: 'CyberPunk Mode', className: 'cyberpunk' },
  { mode: 'Light Mode', className: '' },
] as const

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
})

test.describe('sidebar', () => {
  test('lists every component and creates a node when one is dragged onto the canvas', async ({ page }) => {
    await expect(page.locator('aside [draggable="true"]')).toHaveText(SIDEBAR_COMPONENTS)

    await sidebarItem(page, 'Service').dragTo(page.locator('.react-flow__pane'), {
      targetPosition: { x: 400, y: 300 },
    })

    await expect(canvasNodes(page)).toHaveCount(1)
    expect(await nodeIds(page)).toEqual(['node-1'])
    await expect(canvasNodes(page).first()).toContainText('Service')
  })

  test('toggles with the keyboard shortcut and the tab bar button', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Components' })
    await clickEmptyCanvas(page)

    await page.keyboard.press('ControlOrMeta+b')
    await expect(heading).toHaveCount(0)
    await page.getByTitle('Open sidebar').click()
    await expect(heading).toBeVisible()
    await page.getByTitle('Close sidebar').click()
    await expect(heading).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+b')
    await expect(heading).toBeVisible()
  })
})

test.describe('tabs', () => {
  test('adds, switches, renames and closes tabs with isolated canvases', async ({ page }) => {
    await dropComponent(page, 'service', 300, 200)
    await expect(canvasNodes(page)).toHaveCount(1)

    await page.getByTitle('New canvas').click()
    await expect(page.getByText('Untitled 2', { exact: true })).toBeVisible()
    await expect(canvasNodes(page)).toHaveCount(0)
    await expect(page.getByTitle('Close tab')).toHaveCount(2)

    await dropComponent(page, 'client', 300, 200)
    await dropComponent(page, 'dns', 600, 200)
    await expect(canvasNodes(page)).toHaveCount(2)

    await page.getByText('Untitled 1', { exact: true }).click()
    await expect(canvasNodes(page)).toHaveCount(1)
    await page.getByText('Untitled 2', { exact: true }).click()
    await expect(canvasNodes(page)).toHaveCount(2)

    await page.getByText('Untitled 2', { exact: true }).dblclick()
    await page.locator('input:focus').fill('Checkout Flow')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Checkout Flow', { exact: true })).toBeVisible()
    await expect(page.getByText('Untitled 2', { exact: true })).toHaveCount(0)

    await page.getByTitle('Close tab').nth(1).click()
    await expect(page.getByText('Checkout Flow', { exact: true })).toHaveCount(0)
    await expect(page.getByTitle('Close tab')).toHaveCount(0)
    await expect(canvasNodes(page)).toHaveCount(1)
  })

  test('keeps the old name when renaming is cancelled or left empty', async ({ page }) => {
    const tabName = page.getByText('Untitled 1', { exact: true })

    await tabName.dblclick()
    await page.locator('input:focus').fill('Discarded')
    await page.keyboard.press('Escape')
    await expect(tabName).toBeVisible()

    await tabName.dblclick()
    await page.locator('input:focus').fill('   ')
    await page.keyboard.press('Enter')
    await expect(tabName).toBeVisible()
  })

  test('keeps nodes and edges independent per tab', async ({ page }) => {
    await loadPreset(page, 'Basic')
    await expect(canvasEdges(page)).toHaveCount(13)

    await page.getByTitle('New canvas').click()
    await expect(canvasNodes(page)).toHaveCount(0)
    await expect(canvasEdges(page)).toHaveCount(0)

    await loadPreset(page, 'Twitter')
    await expect(canvasEdges(page)).toHaveCount(22)

    await page.getByText('Untitled 1', { exact: true }).click()
    await expect(canvasNodes(page)).toHaveCount(14)
    await expect(canvasEdges(page)).toHaveCount(13)

    await page.getByText('Untitled 2', { exact: true }).click()
    await expect(canvasNodes(page)).toHaveCount(18)
    await expect(canvasEdges(page)).toHaveCount(22)
  })
})

test.describe('theme', () => {
  test('switches between all five themes', async ({ page }) => {
    const html = page.locator('html')
    await page.getByTitle('Settings').click()
    await page.getByRole('button', { name: 'Theme (Light)' }).click()

    for (const theme of THEMES) {
      await page.getByRole('button', { name: theme.mode }).click()
      await expect(html).toHaveAttribute('class', theme.className)
    }
  })

  test('keeps the selected theme after reload', async ({ page }) => {
    await page.getByTitle('Settings').click()
    await page.getByRole('button', { name: 'Theme (Light)' }).click()
    await page.getByRole('button', { name: 'Dream Mode' }).click()

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('class', 'dream')
    await page.getByTitle('Settings').click()
    await expect(page.getByRole('button', { name: 'Theme (Dream)' })).toBeVisible()
  })
})
