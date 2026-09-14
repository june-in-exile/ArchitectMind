import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'

const PREVIEW_URL = 'http://localhost:4173'
const REAL_BACKEND = process.env.E2E_REAL_BACKEND === '1'
const REAL_BACKEND_SPEC = /real-backend\.spec\.ts$/
const VISUAL_SPEC = /visual\.spec\.ts$/
const OFFLINE_SHELL_SPEC = /offline-shell\.spec\.ts$/

const desktop = {
  viewport: { width: 1440, height: 900 },
  locale: 'en-US',
  colorScheme: 'light' as const,
}

const mockedProjects: NonNullable<PlaywrightTestConfig['projects']> = [
  {
    name: 'desktop-chromium-no-sw',
    testIgnore: [REAL_BACKEND_SPEC, OFFLINE_SHELL_SPEC],
    use: { ...devices['Desktop Chrome'], ...desktop, serviceWorkers: 'block' },
  },
  {
    name: 'desktop-webkit',
    testIgnore: [REAL_BACKEND_SPEC, OFFLINE_SHELL_SPEC],
    use: { ...devices['Desktop Safari'], ...desktop, serviceWorkers: 'block' },
  },
  {
    // Screenshots are compared only without a service worker: the worker does not change rendering,
    // and new baselines here would be captured after the font change they are meant to guard.
    name: 'desktop-chromium-sw',
    testIgnore: [REAL_BACKEND_SPEC, VISUAL_SPEC],
    use: { ...devices['Desktop Chrome'], ...desktop, serviceWorkers: 'allow' },
  },
]

const realBackendProjects: NonNullable<PlaywrightTestConfig['projects']> = REAL_BACKEND
  ? [
      {
        name: 'real-backend',
        testMatch: REAL_BACKEND_SPEC,
        use: { ...devices['Desktop Chrome'], ...desktop, serviceWorkers: 'block' },
      },
    ]
  : []

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  use: {
    baseURL: PREVIEW_URL,
    trace: 'retain-on-failure',
  },
  projects: [...mockedProjects, ...realBackendProjects],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: PREVIEW_URL,
      // Never test whatever already listens on 4173: it may be a stale build or another project.
      reuseExistingServer: false,
      timeout: 180_000,
    },
    ...(REAL_BACKEND
      ? [{ command: 'go run _cmd/main.go', cwd: '..', port: 8080, reuseExistingServer: false, timeout: 120_000 }]
      : []),
  ],
})
