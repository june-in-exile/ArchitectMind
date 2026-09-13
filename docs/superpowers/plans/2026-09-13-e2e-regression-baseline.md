# E2E 回歸測試基準（PR 1）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不修改 `frontend/src/` 的前提下，用 Playwright 記錄 ArchitectMind 桌面網頁版目前的行為與畫面，作為 PR 2（PWA 與持久化）的回歸防護。

**Architecture:**
- **測試環境**：測試跑在 production build 上（`vite build` + `vite preview`）。
- **API**：`POST /api/topology` 預設用 `context.route`（spec §9.2）mock 成固定回應。真實後端的 smoke test 要設定環境變數才會執行。
- **共用程式碼**：操作集中在 `e2e/support/app.ts`，spec 依功能拆成 7 個檔案。
- **Selector**：PR 1 不能修改 `src/`，所以 selector 只依賴現有 DOM，包括文字、`title`、`placeholder`，以及 React Flow 的 `data-id`。

**Tech Stack:** `@playwright/test` 1.63.0（Chromium、WebKit）、TypeScript 5.9、Vite 7

**Spec:** `docs/superpowers/specs/2026-09-13-pwa-canvas-persistence-design.md`，對應 §9.1、§9.2，以及 §14 的 PR 1

## Global Constraints

- **不修改 `frontend/src/`**：完成時 `git diff main --stat -- frontend/src` 的輸出必須是空的。
- **這是特性測試**：在目前的程式碼上就應該通過，不走 RED 階段。測試失敗時修正測試本身，不修改應用程式。
- **不可放寬斷言**：不能為了讓測試通過，刪掉斷言或改成沒有意義的比對（例如把 `toHaveCount(14)` 改成 `toBeGreaterThan(0)`）。
- **projects**：只有 `desktop-chromium-no-sw`（`serviceWorkers: 'block'`）與 `desktop-webkit`（同樣 `serviceWorkers: 'block'`，讓 PR 2 加入 SW 後 mock 仍然可靠）。`desktop-chromium-sw` 屬於 PR 2。
- **瀏覽器設定**：viewport 1440×900、`locale: 'en-US'`、`colorScheme: 'light'`。
- **截圖設定**：`maxDiffPixelRatio: 0.01`、`animations: 'disabled'`，截圖前等待 `document.fonts.ready`。
- **截圖基準**：在本機 macOS 產生並 commit，檔名會帶 `darwin`。
- **版本**：`@playwright/test` 固定為 `1.63.0`。
- **ESLint 相容**：
  - helper 名稱不可用 `use` 開頭，因為 ESLint 的 `react-hooks` 規則會套用到 `e2e/`。
  - 不使用 Playwright 的 `test.extend` fixture，它的 `use()` callback 會被同一條規則誤判。
- **不可變**：helper 回傳新值，不修改傳入的物件，也不對陣列 `push`。
- **WebKit 失敗的處理**：
  - 如果失敗是 Playwright 本身的限制（不是應用程式行為），用 `test.skip(browserName === 'webkit', '具體原因')` 跳過，並在 PR 描述中列出。
  - 如果是應用程式在 Safari 上的真實行為差異，就照實記錄那個行為。
- **完成條件**：`npm run lint`、`npm run build`、`npm run test:e2e` 全部通過。
- **Commit**：訊息格式 `<type>: <description>`，不加 `Co-Authored-By`（使用者設定已停用 attribution）。

## 已驗證的現況

2026-09-13 在 `ecaebc2` 的 production build 上，用 Playwright（Chromium）實際操作確認：

| 項目 | 現況 |
| --- | --- |
| 初次載入 | 1 個 tab `Untitled 1`、0 個 node、Sidebar 標題 `Components`、屬性面板顯示 `Select a component to view properties`；console 沒有 error 與 warning；畫布空白時不送 `/api/topology` |
| Sidebar 元件 | 依序是 `Client`、`DNS`、`CDN`、`Firewall`、`Load Balancer`、`Reverse Proxy`、`API Gateway`、`Service`、`Message Queue`、`Cache`、`Database`、`Storage`、`Monitor`（`logger` 顯示為 Monitor） |
| 拖放 | 真實的 `dragTo`，以及合成的 `dragover`/`drop`（`dataTransfer` type `application/architectmind`），都會建立 node，第一個 id 是 `node-1` |
| Presets | `Demo ▾` 選單。node/edge 數量：Basic 14/13、Twitter 18/22、YouTube 19/27、Google 19/20。載入後 50ms 會執行 500ms 的 `fitView` 動畫 |
| Basic preset 的 id | node：`demo-client`、`demo-dns`、`demo-firewall`、`demo-cdn`、`demo-lb`、`demo-reverse-proxy`、`demo-apigw`、`demo-service`、`demo-mq`、`demo-db-master`、`demo-db-slave`、`demo-cache`、`demo-storage`、`demo-logger`；edge：`e-client-dns`、`e-client-cdn`、`e-client-firewall`、`e-firewall-lb`、`e-cdn-storage`、`e-lb-proxy`、`e-proxy-apigw`、`e-apigw-service`、`e-service-mq`、`e-service-dbm`、`e-service-dbs`、`e-service-cache`、`e-service-logger` |
| Basic preset 的 edge 標籤 | `DNS · sync` ×1、`HTTPS · sync` ×4、`HTTP · sync` ×3、`AMQP · async` ×1、`DATABASE · sync` ×2、`RESP · sync` ×1、`HTTP · async` ×1 |
| 分析 | 變更後 debounce 800ms，連續 3 次拖放只送 1 次請求。摘要是 `${nodeCount} nodes, ${edgeCount} edges`，數字取自 API 回應。有 warning 時顯示 `N warning(s)`，並自動展開 `PROBLEMS` 面板。徽章是 `${rulesPassed}/${totalRules}` 加上 `rules passed`。warning 的規則名稱顯示為 `[規則名稱]`，底線換成空格。request body 的 key 是 `id`、`name`、`version`、`nodes`、`edges`，有系統參數時多一個 `params` |
| 點擊 warning | `.react-flow__viewport` 的 `style` 會改變（`fitView` 到該 node） |
| 後端錯誤 | HTTP 500 時顯示 `Analysis failed`，warning 訊息是回應的 `error` 欄位，solution 是 `Please ensure the backend service is running and try again.`。連線中斷時顯示同樣的 solution |
| 刪除 | 點選 node 後按 `Backspace` 刪除（相連的 edge 一起刪）。`ControlOrMeta+a` 再按 `Backspace` 會刪除全部，摘要與徽章消失 |
| Node 屬性 | 點 node 後出現 `Component Properties`。修改 `label:text-is("Label") + input`，node 上的文字跟著更新 |
| Edge 屬性 | 點 edge 的中心點後出現 `Edge Properties`。Protocol 選 `http`，`HTTP · sync` 從 3 個變 4 個。Connection Type 選 `async`，`HTTP · async` 從 1 個變 2 個，edge 的 path 樣式包含 `stroke-dasharray: 8, 6`。Label 輸入框（placeholder `Optional label`）**不會**把文字顯示在畫布上 |
| Params | 按鈕文字 `Params`，彈窗標題 `System Parameters`，DAU 輸入框 placeholder `e.g., 1000000`。填入 1000000 後顯示 `💡 Estimated Peak QPS ≈ 116 (DAU/86400 × 10)`。關閉按鈕是 `✕`。有參數時，按鈕內多一個圓點 `span` |
| 編輯 | 按住 Shift 拖曳 `demo-cache` 會複製出 `node-1`。點 `demo-storage` 後按 `ControlOrMeta+c`、`ControlOrMeta+v` 會貼上一個新 node。`ControlOrMeta+z` 是 undo，`ControlOrMeta+Shift+z` 是 redo。`ControlOrMeta+a` 全選（`.react-flow__node.selected`） |
| Merge / Split | 點 `demo-service`，再按住 Shift 點 `demo-mq`，工具列出現 `Merge`。按下後剩 13 個 node，`demo-service` 顯示 `Service + Message Queue`，並出現 `Split`。按 Split 後恢復 14 個。`Control+m` 也能合併（只認 Ctrl，macOS 也一樣） |
| 取消選取 | 用 `page.mouse.click` 點畫布 pane 左上角往內 24px 的位置 |
| Node 重疊 | 用拖放建立的 node 位置不容易預測，可能會重疊，這時 `locator.click()` 點到被遮住的 node 會逾時。所以編輯類的測試都改用 Basic preset |
| Tabs | 新增按鈕 title 是 `New canvas`，關閉按鈕 title 是 `Close tab`（只剩一個 tab 時不存在）。雙擊名稱會出現輸入框，按 Enter 確認。各 tab 的畫布內容互不影響 |
| Sidebar 開關 | `ControlOrMeta+b`，或 title 為 `Close sidebar`／`Open sidebar` 的按鈕 |
| 主題 | 按 title 為 `Settings` 的按鈕 → `Theme (Light)` → `Light Mode`、`Dark Mode`、`Warm Mode`、`Dream Mode`、`CyberPunk Mode`。`<html>` 的 class 依序為空字串、`dark`、`warm`、`dream`、`cyberpunk`。選擇會存到 localStorage 的 `theme`，重新整理後保留 |
| 匯出 | Settings → `Export` 之後：<br>• `Mermaid (.mmd)`：下載 `architecture.mmd`，提示 `Downloaded .mmd`<br>• `Excalidraw (.excalidraw)`：下載 `architecture.excalidraw`，提示 `Downloaded .excalidraw`<br>• `PNG Image`：下載 `architecture.png`，提示 `PNG exported`<br>• `PDF Document`：下載 `architecture.pdf`，提示 `PDF exported`<br>Mermaid 與 Excalidraw 的內容每次都一樣 |
| 匯出的注意事項 | PNG、PDF 匯出時，console 會出現讀取 Google Fonts `cssRules` 的 SecurityError，這是既有行為，所以匯出測試不可斷言 console 沒有 error。匯出完成後再打開 Settings，會直接停在 Export 子選單，所以每個匯出測試都用一個全新的頁面 |
| `vite preview` | 會沿用 `server.proxy`，把 `/api` 轉發到 `localhost:8080` |
| 本機環境 | 8080 目前被 OrbStack 占用，要先釋放才能跑真實後端的 smoke test |
| WebKit | 尚未實測，處理方式見 Global Constraints |

## File Structure

```text
frontend/
├── package.json                  # 修改：devDependency @playwright/test、script test:e2e
├── playwright.config.ts          # 新增：projects、webServer、截圖設定
├── tsconfig.json                 # 修改：references 加上 tsconfig.e2e.json
├── tsconfig.e2e.json             # 新增：e2e 與 playwright.config.ts 的型別檢查
├── .gitignore                    # 修改：忽略 Playwright 輸出
└── e2e/
    ├── fixtures/analysis.ts      # 分析 API 的固定回應
    ├── support/app.ts            # 共用操作與常數
    ├── initial-load.spec.ts      # Task 1
    ├── app-shell.spec.ts         # Task 2：Sidebar、Tabs、主題
    ├── properties.spec.ts        # Task 3：連線、node/edge 屬性、Params
    ├── editing.spec.ts           # Task 4：複製、貼上、undo/redo、Merge/Split、刪除
    ├── analysis.spec.ts          # Task 5：自動分析與錯誤
    ├── presets-exports.spec.ts   # Task 6：Presets 與匯出
    ├── visual.spec.ts            # Task 7：截圖基準
    └── real-backend.spec.ts      # Task 8：真實後端（需要 E2E_REAL_BACKEND=1）
CLAUDE.md                          # Task 8：補充指令與規則
```

以下所有指令都在 `frontend/` 目錄執行，除非另外註明。

---

### Task 1: Playwright 基礎設施與初次載入測試

**Files:**
- Modify: `frontend/package.json`、`frontend/tsconfig.json`、`frontend/.gitignore`
- Create: `frontend/playwright.config.ts`、`frontend/tsconfig.e2e.json`、`frontend/e2e/fixtures/analysis.ts`、`frontend/e2e/support/app.ts`
- Test: `frontend/e2e/initial-load.spec.ts`

**Interfaces:**
- Consumes: 無
- Produces（`e2e/fixtures/analysis.ts`）：
  - `interface AnalysisFixture`
  - `cleanAnalysis: AnalysisFixture`：14 nodes、13 edges、45/45，沒有 warning
  - `warningAnalysis: AnalysisFixture`：14 nodes、13 edges、44/45，一個 `no_healthcheck_behind_lb` warning，指向 `demo-service`
- Produces（`e2e/support/app.ts`）：
  - 常數：`ANALYSIS_SETTLE_MS = 1500`、`BACKEND_ERROR_SOLUTION`、`PRESET_COUNTS`
  - 型別：`type PresetName = 'Basic' | 'Twitter' | 'YouTube' | 'Google'`、`type ComponentTypeId`、`interface AnalysisRecorder { requests(): readonly Record<string, unknown>[] }`
  - 設定與導覽：`mockAnalysis(page, response): Promise<AnalysisRecorder>`、`openApp(page): Promise<void>`
  - Locator：`canvasNodes(page)`、`canvasEdges(page)`、`nodeById(page, id)`、`edgeById(page, id)`、`analysisSummary(page)`、`sidebarItem(page, label)`
  - 讀取：`nodeIds(page): Promise<string[]>`、`collectConsoleProblems(page): () => readonly string[]`
  - 等待：`waitForViewportToSettle(page): Promise<void>`、`settleForScreenshot(page): Promise<void>`
  - 操作：`loadPreset(page, name): Promise<void>`、`dropComponent(page, type, x, y): Promise<void>`、`clickEmptyCanvas(page): Promise<void>`、`clickEdge(page, id): Promise<void>`、`dragWithShift(page, locator, dx, dy): Promise<void>`、`connectHandles(page, sourceNodeId, sourceHandle, targetNodeId, targetHandle): Promise<void>`、`exportAs(page, label): Promise<Download>`、`downloadedFilePath(download): Promise<string>`

- [ ] **Step 1: 確認分支，並 commit 本計畫**

Run: `git -C .. branch --show-current && git -C .. status --short`
Expected: 分支是 `test/e2e-regression-baseline`，唯一未 commit 的是 `docs/superpowers/plans/`。

```bash
git -C .. add docs/superpowers/plans/2026-09-13-e2e-regression-baseline.md
git -C .. commit -m "docs: add e2e regression baseline plan"
```

- [ ] **Step 2: 安裝 Playwright 與瀏覽器**

```bash
npm install --save-dev --save-exact @playwright/test@1.63.0
npx playwright install chromium webkit
```

Expected：
- `package.json` 的 `devDependencies` 出現 `"@playwright/test": "1.63.0"`。
- 瀏覽器下載完成，沒有錯誤。

- [ ] **Step 3: 在 `package.json` 加上 script**

把 `scripts` 改成：

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test:e2e": "playwright test"
},
```

- [ ] **Step 4: 在 `frontend/.gitignore` 最後加上 Playwright 輸出目錄**

```gitignore

# Playwright
/test-results
/playwright-report
/blob-report
/playwright/.cache
```

- [ ] **Step 5: 建立 `tsconfig.e2e.json`，並加進 `tsconfig.json`**

`frontend/tsconfig.e2e.json`：

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.e2e.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["e2e", "playwright.config.ts"]
}
```

`frontend/tsconfig.json` 改成：

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.e2e.json" }
  ]
}
```

- [ ] **Step 6: 建立 `playwright.config.ts`**

```ts
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'

const PREVIEW_URL = 'http://localhost:4173'
const REAL_BACKEND = process.env.E2E_REAL_BACKEND === '1'
const REAL_BACKEND_SPEC = /real-backend\.spec\.ts$/

const desktop = {
  viewport: { width: 1440, height: 900 },
  locale: 'en-US',
  colorScheme: 'light' as const,
}

const mockedProjects: NonNullable<PlaywrightTestConfig['projects']> = [
  {
    name: 'desktop-chromium-no-sw',
    testIgnore: REAL_BACKEND_SPEC,
    use: { ...devices['Desktop Chrome'], ...desktop, serviceWorkers: 'block' },
  },
  {
    name: 'desktop-webkit',
    testIgnore: REAL_BACKEND_SPEC,
    use: { ...devices['Desktop Safari'], ...desktop, serviceWorkers: 'block' },
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
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    ...(REAL_BACKEND
      ? [{ command: 'go run _cmd/main.go', cwd: '..', port: 8080, reuseExistingServer: false, timeout: 120_000 }]
      : []),
  ],
})
```

- [ ] **Step 7: 建立 `e2e/fixtures/analysis.ts`**

```ts
export interface AnalysisWarningFixture {
  readonly rule: string
  readonly message: string
  readonly solution: string
  readonly nodeIds: readonly string[]
}

export interface AnalysisFixture {
  readonly success: boolean
  readonly nodeCount: number
  readonly edgeCount: number
  readonly totalRules: number
  readonly rulesPassed: number
  readonly warnings: readonly AnalysisWarningFixture[]
}

export const cleanAnalysis: AnalysisFixture = {
  success: true,
  nodeCount: 14,
  edgeCount: 13,
  totalRules: 45,
  rulesPassed: 45,
  warnings: [],
}

export const warningAnalysis: AnalysisFixture = {
  success: true,
  nodeCount: 14,
  edgeCount: 13,
  totalRules: 45,
  rulesPassed: 44,
  warnings: [
    {
      rule: 'no_healthcheck_behind_lb',
      message: 'Services behind the load balancer have no health check.',
      solution: 'Enable health checks on every service behind the load balancer.',
      nodeIds: ['demo-service'],
    },
  ],
}
```

- [ ] **Step 8: 建立 `e2e/support/app.ts`**

```ts
import { expect, type Download, type Locator, type Page } from '@playwright/test'
import type { AnalysisFixture } from '../fixtures/analysis'

export const ANALYSIS_SETTLE_MS = 1500
const FIT_VIEW_START_MS = 100
const VIEWPORT_SAMPLE_GAP_MS = 150

export const BACKEND_ERROR_SOLUTION = 'Please ensure the backend service is running and try again.'

export type PresetName = 'Basic' | 'Twitter' | 'YouTube' | 'Google'

export const PRESET_COUNTS: Readonly<Record<PresetName, { readonly nodes: number; readonly edges: number }>> = {
  Basic: { nodes: 14, edges: 13 },
  Twitter: { nodes: 18, edges: 22 },
  YouTube: { nodes: 19, edges: 27 },
  Google: { nodes: 19, edges: 20 },
}

export type ComponentTypeId =
  | 'client'
  | 'dns'
  | 'cdn'
  | 'firewall'
  | 'load_balancer'
  | 'reverse_proxy'
  | 'api_gateway'
  | 'service'
  | 'message_queue'
  | 'cache'
  | 'database'
  | 'storage'
  | 'logger'

export interface AnalysisRecorder {
  readonly requests: () => readonly Record<string, unknown>[]
}

export async function mockAnalysis(page: Page, response: AnalysisFixture): Promise<AnalysisRecorder> {
  let bodies: readonly Record<string, unknown>[] = []
  await page.context().route('**/api/topology', async (route) => {
    bodies = [...bodies, route.request().postDataJSON() as Record<string, unknown>]
    await route.fulfill({ json: response })
  })
  return { requests: () => bodies }
}

export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByText('Untitled 1', { exact: true })).toBeVisible()
}

export const canvasNodes = (page: Page): Locator => page.locator('.react-flow__node')
export const canvasEdges = (page: Page): Locator => page.locator('.react-flow__edge')
export const nodeById = (page: Page, id: string): Locator => page.locator(`.react-flow__node[data-id="${id}"]`)
export const edgeById = (page: Page, id: string): Locator => page.locator(`.react-flow__edge[data-id="${id}"]`)
export const analysisSummary = (page: Page): Locator => page.getByText(/^\d+ nodes, \d+ edges/)
export const sidebarItem = (page: Page, label: string): Locator =>
  page.locator('aside [draggable="true"]').filter({ has: page.getByText(label, { exact: true }) })

export async function nodeIds(page: Page): Promise<string[]> {
  return canvasNodes(page).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-id') ?? ''))
}

export function collectConsoleProblems(page: Page): () => readonly string[] {
  let problems: readonly string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems = [...problems, `${message.type()}: ${message.text()}`]
    }
  })
  page.on('pageerror', (error) => {
    problems = [...problems, `pageerror: ${error.message}`]
  })
  return () => problems
}

export async function waitForViewportToSettle(page: Page): Promise<void> {
  const viewport = page.locator('.react-flow__viewport')
  await page.waitForTimeout(FIT_VIEW_START_MS)
  await expect
    .poll(async () => {
      const first = await viewport.getAttribute('style')
      await page.waitForTimeout(VIEWPORT_SAMPLE_GAP_MS)
      return first === (await viewport.getAttribute('style'))
    })
    .toBe(true)
}

export async function settleForScreenshot(page: Page): Promise<void> {
  await page.mouse.move(0, 0)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

export async function loadPreset(page: Page, name: PresetName): Promise<void> {
  await page.getByRole('button', { name: 'Demo ▾' }).click()
  await page.getByRole('button', { name, exact: true }).click()
  await expect(canvasNodes(page)).toHaveCount(PRESET_COUNTS[name].nodes)
  await waitForViewportToSettle(page)
}

export async function dropComponent(page: Page, type: ComponentTypeId, x: number, y: number): Promise<void> {
  const pane = page.locator('.react-flow__pane')
  const box = await pane.boundingBox()
  if (!box) throw new Error('React Flow pane is not visible')
  const dataTransfer = await page.evaluateHandle((componentType) => {
    const transfer = new DataTransfer()
    transfer.setData('application/architectmind', componentType)
    return transfer
  }, type)
  const init = { dataTransfer, clientX: box.x + x, clientY: box.y + y }
  await pane.dispatchEvent('dragover', init)
  await pane.dispatchEvent('drop', init)
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element has no bounding box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export async function clickEmptyCanvas(page: Page): Promise<void> {
  const box = await page.locator('.react-flow__pane').boundingBox()
  if (!box) throw new Error('React Flow pane is not visible')
  await page.mouse.click(box.x + 24, box.y + 24)
}

export async function clickEdge(page: Page, id: string): Promise<void> {
  const { x, y } = await centerOf(edgeById(page, id))
  await page.mouse.click(x, y)
}

export async function dragWithShift(page: Page, locator: Locator, dx: number, dy: number): Promise<void> {
  const { x, y } = await centerOf(locator)
  await page.keyboard.down('Shift')
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 8 })
  await page.mouse.up()
  await page.keyboard.up('Shift')
}

export async function connectHandles(
  page: Page,
  sourceNodeId: string,
  sourceHandle: string,
  targetNodeId: string,
  targetHandle: string,
): Promise<void> {
  const handle = (nodeId: string, handleId: string) =>
    nodeById(page, nodeId).locator(`.react-flow__handle[data-handleid="${handleId}"]`)
  const from = await centerOf(handle(sourceNodeId, sourceHandle))
  const to = await centerOf(handle(targetNodeId, targetHandle))
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()
}

export async function exportAs(page: Page, label: string): Promise<Download> {
  await page.getByTitle('Settings').click()
  await page.getByRole('button', { name: /^Export/ }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: label, exact: true }).click(),
  ])
  return download
}

export async function downloadedFilePath(download: Download): Promise<string> {
  const path = await download.path()
  if (!path) throw new Error(`Download failed: ${download.suggestedFilename()}`)
  return path
}
```

- [ ] **Step 9: 撰寫 `e2e/initial-load.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { ANALYSIS_SETTLE_MS, canvasNodes, collectConsoleProblems, mockAnalysis, openApp } from './support/app'

test.describe('initial load', () => {
  test('shows a single empty canvas with the sidebar open', async ({ page }) => {
    const consoleProblems = collectConsoleProblems(page)
    const recorder = await mockAnalysis(page, cleanAnalysis)

    await openApp(page)

    await expect(page).toHaveTitle('ArchitectMind - System Design Visualizer')
    await expect(page.getByText(/^Untitled \d+$/)).toHaveCount(1)
    await expect(page.getByTitle('Close tab')).toHaveCount(0)
    await expect(canvasNodes(page)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Components' })).toBeVisible()
    await expect(page.getByTitle('Close sidebar')).toBeVisible()
    await expect(page.getByText('Select a component to view properties')).toBeVisible()
    await expect(page.getByText('rules passed')).toHaveCount(0)

    await page.waitForTimeout(ANALYSIS_SETTLE_MS)
    expect(recorder.requests()).toHaveLength(0)
    expect(consoleProblems()).toEqual([])
  })

  test('shows no update prompt, storage warning or offline notice', async ({ page }) => {
    await mockAnalysis(page, cleanAnalysis)
    await openApp(page)

    await expect(page.getByText(/new version|offline|couldn't be saved|blocking local storage/i)).toHaveCount(0)
  })
})
```

- [ ] **Step 10: 執行測試**

Run: `npx playwright test e2e/initial-load.spec.ts`
Expected: `4 passed`（2 個測試 × 2 個 project）。第一次執行會先 build 並啟動 preview，需要較久。

- [ ] **Step 11: 確認 lint 與 build**

Run: `npm run lint && npm run build`
Expected: 兩者都成功。`tsc -b` 會一併檢查 `tsconfig.e2e.json` 的型別。

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json .gitignore tsconfig.json tsconfig.e2e.json playwright.config.ts e2e/fixtures/analysis.ts e2e/support/app.ts e2e/initial-load.spec.ts
git commit -m "test: add Playwright setup and initial load characterization"
```

---

### Task 2: Sidebar、Tabs 與主題

**Files:**
- Test: `frontend/e2e/app-shell.spec.ts`

**Interfaces:**
- Consumes：`cleanAnalysis`，以及 `mockAnalysis`、`openApp`、`canvasNodes`、`nodeIds`、`sidebarItem`、`dropComponent`、`clickEmptyCanvas`（Task 1）
- Produces：無

- [ ] **Step 1: 撰寫 `e2e/app-shell.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  canvasNodes,
  clickEmptyCanvas,
  dropComponent,
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
```

- [ ] **Step 2: 執行測試**

Run: `npx playwright test e2e/app-shell.spec.ts`
Expected: `12 passed`

- [ ] **Step 3: 確認 lint**

Run: `npm run lint`
Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add e2e/app-shell.spec.ts
git commit -m "test: characterize sidebar, tabs and theme behavior"
```

---

### Task 3: 連線、屬性面板與系統參數

**Files:**
- Test: `frontend/e2e/properties.spec.ts`

**Interfaces:**
- Consumes：`cleanAnalysis`，以及 `mockAnalysis`、`openApp`、`loadPreset`、`canvasEdges`、`nodeById`、`edgeById`、`clickEdge`、`connectHandles`（Task 1）
- Produces：無

- [ ] **Step 1: 撰寫 `e2e/properties.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  canvasEdges,
  clickEdge,
  connectHandles,
  edgeById,
  loadPreset,
  mockAnalysis,
  nodeById,
  openApp,
} from './support/app'

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
  await loadPreset(page, 'Basic')
})

test('connecting two handles creates an edge', async ({ page }) => {
  await expect(canvasEdges(page)).toHaveCount(13)

  await connectHandles(page, 'demo-storage', 'bottom-source', 'demo-cache', 'top-target')

  await expect(canvasEdges(page)).toHaveCount(14)
  await expect(edgeById(page, 'edge-demo-storage-demo-cache')).toHaveCount(1)
})

test('editing a node label updates the canvas', async ({ page }) => {
  await nodeById(page, 'demo-service').click()
  await expect(page.getByText('Component Properties')).toBeVisible()

  await page.locator('label:text-is("Label") + input').fill('Order Service')

  await expect(nodeById(page, 'demo-service')).toContainText('Order Service')
})

test('edge protocol and connection type update the edge label and style', async ({ page }) => {
  await expect(page.getByText('DNS · sync', { exact: true })).toHaveCount(1)
  await expect(page.getByText('HTTP · sync', { exact: true })).toHaveCount(3)
  await expect(page.getByText('HTTP · async', { exact: true })).toHaveCount(1)

  await clickEdge(page, 'e-client-dns')
  await expect(page.getByText('Edge Properties')).toBeVisible()

  await page.locator('label:text-is("Protocol") + select').selectOption('http')
  await expect(page.getByText('DNS · sync', { exact: true })).toHaveCount(0)
  await expect(page.getByText('HTTP · sync', { exact: true })).toHaveCount(4)

  await page.locator('label:text-is("Connection Type") + select').selectOption('async')
  await expect(page.getByText('HTTP · async', { exact: true })).toHaveCount(2)
  await expect(edgeById(page, 'e-client-dns').locator('path.react-flow__edge-path')).toHaveAttribute(
    'style',
    /stroke-dasharray: 8,? ?6/,
  )
})

test('the edge label field does not render text on the canvas', async ({ page }) => {
  await clickEdge(page, 'e-client-dns')
  const labelInput = page.getByPlaceholder('Optional label')

  await labelInput.fill('resolves')

  await expect(labelInput).toHaveValue('resolves')
  await expect(page.locator('.react-flow__edgelabel-renderer').getByText('resolves')).toHaveCount(0)
})

test('system parameters panel shows the estimate and marks the button', async ({ page }) => {
  const paramsButton = page.getByRole('button', { name: 'Params' })
  await expect(paramsButton.locator('span')).toHaveCount(0)

  await paramsButton.click()
  await expect(page.getByText('System Parameters')).toBeVisible()
  await page.getByPlaceholder('e.g., 1000000').fill('1000000')
  await expect(page.getByText('💡 Estimated Peak QPS ≈ 116 (DAU/86400 × 10)')).toBeVisible()

  await page.getByRole('button', { name: '✕' }).click()
  await expect(page.getByText('System Parameters')).toHaveCount(0)
  await expect(paramsButton.locator('span')).toHaveCount(1)
})
```

- [ ] **Step 2: 執行測試**

Run: `npx playwright test e2e/properties.spec.ts`
Expected: `10 passed`

- [ ] **Step 3: 確認 lint**

Run: `npm run lint`
Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add e2e/properties.spec.ts
git commit -m "test: characterize connections, property panels and system params"
```

---

### Task 4: 複製、貼上、undo/redo、Merge/Split 與刪除

**Files:**
- Test: `frontend/e2e/editing.spec.ts`

**Interfaces:**
- Consumes：`cleanAnalysis`，以及 `mockAnalysis`、`openApp`、`loadPreset`、`canvasNodes`、`canvasEdges`、`nodeById`、`edgeById`、`clickEmptyCanvas`、`dragWithShift`（Task 1）
- Produces：無

- [ ] **Step 1: 撰寫 `e2e/editing.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  canvasEdges,
  canvasNodes,
  clickEmptyCanvas,
  dragWithShift,
  edgeById,
  loadPreset,
  mockAnalysis,
  nodeById,
  openApp,
} from './support/app'

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
  await loadPreset(page, 'Basic')
})

test('shift+drag duplicates the dragged node', async ({ page }) => {
  await dragWithShift(page, nodeById(page, 'demo-cache'), 48, 48)

  await expect(canvasNodes(page)).toHaveCount(15)
  await expect(nodeById(page, 'demo-cache')).toHaveCount(1)
  await expect(nodeById(page, 'node-1')).toContainText('Cache')
})

test('copy and paste duplicates the selected node', async ({ page }) => {
  await nodeById(page, 'demo-storage').click()

  await page.keyboard.press('ControlOrMeta+c')
  await page.keyboard.press('ControlOrMeta+v')

  await expect(canvasNodes(page)).toHaveCount(15)
  await expect(nodeById(page, 'node-1')).toContainText('Storage')
})

test('undo and redo revert and reapply a paste', async ({ page }) => {
  await nodeById(page, 'demo-storage').click()
  await page.keyboard.press('ControlOrMeta+c')
  await page.keyboard.press('ControlOrMeta+v')
  await expect(canvasNodes(page)).toHaveCount(15)

  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvasNodes(page)).toHaveCount(14)

  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(canvasNodes(page)).toHaveCount(15)
})

test('select all selects every node', async ({ page }) => {
  await clickEmptyCanvas(page)

  await page.keyboard.press('ControlOrMeta+a')

  await expect(page.locator('.react-flow__node.selected')).toHaveCount(14)
})

test('merge and split through the toolbar buttons', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Merge' })).toHaveCount(0)

  await nodeById(page, 'demo-service').click()
  await nodeById(page, 'demo-mq').click({ modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Merge' }).click()

  await expect(canvasNodes(page)).toHaveCount(13)
  await expect(nodeById(page, 'demo-mq')).toHaveCount(0)
  await expect(nodeById(page, 'demo-service')).toContainText(/Service\s*\+\s*Message Queue/)

  await page.getByRole('button', { name: 'Split' }).click()

  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(nodeById(page, 'demo-mq')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Split' })).toHaveCount(0)
})

test('Ctrl+M merges two selected nodes and undo restores them', async ({ page }) => {
  await nodeById(page, 'demo-service').click()
  await nodeById(page, 'demo-mq').click({ modifiers: ['Shift'] })

  await page.keyboard.press('Control+m')
  await expect(canvasNodes(page)).toHaveCount(13)

  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvasNodes(page)).toHaveCount(14)
})

test('Backspace deletes the selected node and its edges', async ({ page }) => {
  await nodeById(page, 'demo-logger').click()

  await page.keyboard.press('Backspace')

  await expect(canvasNodes(page)).toHaveCount(13)
  await expect(nodeById(page, 'demo-logger')).toHaveCount(0)
  await expect(edgeById(page, 'e-service-logger')).toHaveCount(0)
  await expect(canvasEdges(page)).toHaveCount(12)
})
```

- [ ] **Step 2: 執行測試**

Run: `npx playwright test e2e/editing.spec.ts`
Expected: `14 passed`

- [ ] **Step 3: 確認 lint**

Run: `npm run lint`
Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add e2e/editing.spec.ts
git commit -m "test: characterize duplicate, clipboard, undo, merge and delete"
```

---

### Task 5: 自動分析與後端錯誤

**Files:**
- Test: `frontend/e2e/analysis.spec.ts`
- Snapshot（自動產生）：`frontend/e2e/analysis.spec.ts-snapshots/basic-preset-request-*-darwin.json`

**Interfaces:**
- Consumes：`cleanAnalysis`、`warningAnalysis`，以及 `ANALYSIS_SETTLE_MS`、`BACKEND_ERROR_SOLUTION`、`mockAnalysis`、`openApp`、`loadPreset`、`canvasNodes`、`analysisSummary`、`dropComponent`、`clickEmptyCanvas`（Task 1）
- Produces：request body 的快照基準。PR 2 會用它確認送出的格式沒有改變

- [ ] **Step 1: 撰寫 `e2e/analysis.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import { cleanAnalysis, warningAnalysis } from './fixtures/analysis'
import {
  ANALYSIS_SETTLE_MS,
  BACKEND_ERROR_SOLUTION,
  analysisSummary,
  canvasNodes,
  clickEmptyCanvas,
  dropComponent,
  loadPreset,
  mockAnalysis,
  openApp,
} from './support/app'

const WARNING_MESSAGE = 'Services behind the load balancer have no health check.'

test.describe('auto analysis', () => {
  test('debounces rapid changes into a single request', async ({ page }) => {
    const recorder = await mockAnalysis(page, cleanAnalysis)
    await openApp(page)

    await dropComponent(page, 'service', 300, 150)
    await dropComponent(page, 'database', 300, 450)
    await dropComponent(page, 'cache', 650, 450)
    await expect(canvasNodes(page)).toHaveCount(3)

    await page.waitForTimeout(ANALYSIS_SETTLE_MS)
    expect(recorder.requests()).toHaveLength(1)
  })

  test('sends the Basic preset topology in the existing request format', async ({ page }) => {
    const recorder = await mockAnalysis(page, cleanAnalysis)
    await openApp(page)

    await loadPreset(page, 'Basic')

    await expect.poll(() => recorder.requests().length).toBe(1)
    expect(JSON.stringify(recorder.requests()[0], null, 2)).toMatchSnapshot('basic-preset-request.json')
  })

  test('includes system parameters in the request once they are set', async ({ page }) => {
    const recorder = await mockAnalysis(page, cleanAnalysis)
    await openApp(page)
    await loadPreset(page, 'Basic')
    await expect.poll(() => recorder.requests().length).toBe(1)
    expect(recorder.requests()[0]).not.toHaveProperty('params')

    await page.getByRole('button', { name: 'Params' }).click()
    await page.getByPlaceholder('e.g., 1000000').fill('1000000')

    await expect.poll(() => recorder.requests().length).toBe(2)
    expect(recorder.requests()[1]).toHaveProperty('params', { dau: 1000000 })
  })

  test('shows the summary, badge and warnings from the response', async ({ page }) => {
    await mockAnalysis(page, warningAnalysis)
    await openApp(page)

    await loadPreset(page, 'Basic')

    await expect(page.getByText('14 nodes, 13 edges')).toBeVisible()
    await expect(page.getByText('1 warning(s)')).toBeVisible()
    await expect(page.getByText('PROBLEMS')).toBeVisible()
    await expect(page.getByText(WARNING_MESSAGE)).toBeVisible()
    await expect(page.getByText('[no healthcheck behind lb]')).toBeVisible()
    await expect(page.getByText('Nodes: demo-service')).toBeVisible()
    await expect(page.getByText('44/45')).toBeVisible()
    await expect(page.getByText('rules passed')).toBeVisible()
  })

  test('clicking a warning focuses the canvas on its node', async ({ page }) => {
    await mockAnalysis(page, warningAnalysis)
    await openApp(page)
    await loadPreset(page, 'Basic')
    const message = page.getByText(WARNING_MESSAGE)
    await expect(message).toBeVisible()
    const viewport = page.locator('.react-flow__viewport')
    const before = await viewport.getAttribute('style')

    await message.click()

    await expect.poll(() => viewport.getAttribute('style')).not.toBe(before)
  })

  test('clears the results after every node is deleted', async ({ page }) => {
    await mockAnalysis(page, warningAnalysis)
    await openApp(page)
    await loadPreset(page, 'Basic')
    await expect(page.getByText('rules passed')).toBeVisible()

    await clickEmptyCanvas(page)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Backspace')

    await expect(canvasNodes(page)).toHaveCount(0)
    await expect(analysisSummary(page)).toHaveCount(0)
    await expect(page.getByText('rules passed')).toHaveCount(0)
    await expect(page.getByText('PROBLEMS')).toHaveCount(0)
  })
})

test.describe('backend errors', () => {
  test('shows the error message when the API returns 500', async ({ page }) => {
    await page.context().route('**/api/topology', (route) => route.fulfill({ status: 500, json: { error: 'Internal failure' } }))
    await openApp(page)

    await loadPreset(page, 'Basic')

    await expect(page.getByText('Analysis failed')).toBeVisible()
    await expect(page.getByText('Internal failure')).toBeVisible()
    await expect(page.getByText(BACKEND_ERROR_SOLUTION)).toBeVisible()
  })

  test('shows the error message when the connection fails', async ({ page }) => {
    await page.context().route('**/api/topology', (route) => route.abort('connectionrefused'))
    await openApp(page)

    await loadPreset(page, 'Basic')

    await expect(page.getByText('Analysis failed')).toBeVisible()
    await expect(page.getByText(BACKEND_ERROR_SOLUTION)).toBeVisible()
  })
})
```

- [ ] **Step 2: 產生 request body 的快照基準**

Run: `npx playwright test e2e/analysis.spec.ts --update-snapshots`
Expected：
- 全部通過。
- 產生 `e2e/analysis.spec.ts-snapshots/basic-preset-request-desktop-chromium-no-sw-darwin.json` 與 `...-desktop-webkit-darwin.json`。

- [ ] **Step 3: 人工檢查快照內容**

Run: `head -20 e2e/analysis.spec.ts-snapshots/basic-preset-request-desktop-chromium-no-sw-darwin.json && grep -c '"componentType"' e2e/analysis.spec.ts-snapshots/basic-preset-request-desktop-chromium-no-sw-darwin.json`

Expected：
- 開頭是 `"id": "current-design"`、`"name": "Untitled Design"`、`"version": 1`。
- `componentType` 出現 14 次。
- 沒有 `params`。

- [ ] **Step 4: 不更新快照再跑一次**

Run: `npx playwright test e2e/analysis.spec.ts`
Expected: `16 passed`

- [ ] **Step 5: 確認 lint**

Run: `npm run lint`
Expected: 成功

- [ ] **Step 6: Commit**

```bash
git add e2e/analysis.spec.ts e2e/analysis.spec.ts-snapshots
git commit -m "test: characterize auto analysis, request format and backend errors"
```

---

### Task 6: Presets 與匯出

**Files:**
- Test: `frontend/e2e/presets-exports.spec.ts`
- Snapshot（自動產生）：`frontend/e2e/presets-exports.spec.ts-snapshots/basic-preset-*-darwin.mmd`、`basic-preset-*-darwin.excalidraw`

**Interfaces:**
- Consumes：`cleanAnalysis`，以及 `PRESET_COUNTS`、`PresetName`、`mockAnalysis`、`openApp`、`loadPreset`、`canvasEdges`、`exportAs`、`downloadedFilePath`（Task 1）
- Produces：匯出內容的快照基準。PR 2 會用它確認 node id 格式沒有改變

- [ ] **Step 1: 撰寫 `e2e/presets-exports.spec.ts`**

```ts
import { readFile, stat } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  PRESET_COUNTS,
  canvasEdges,
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
```

- [ ] **Step 2: 產生匯出內容的快照基準**

Run: `npx playwright test e2e/presets-exports.spec.ts --update-snapshots`
Expected：
- 全部通過。
- `e2e/presets-exports.spec.ts-snapshots/` 下出現 `.mmd` 與 `.excalidraw` 快照，每個 project 各一份。

- [ ] **Step 3: 人工檢查快照內容**

Run:

```bash
SNAP=e2e/presets-exports.spec.ts-snapshots
head -2 $SNAP/basic-preset-desktop-chromium-no-sw-darwin.mmd
grep -cE -- '-->|-\.->' $SNAP/basic-preset-desktop-chromium-no-sw-darwin.mmd
grep -c -- '-\.->' $SNAP/basic-preset-desktop-chromium-no-sw-darwin.mmd
grep -c '"type": "rectangle"' $SNAP/basic-preset-desktop-chromium-no-sw-darwin.excalidraw
grep -c '"type": "arrow"' $SNAP/basic-preset-desktop-chromium-no-sw-darwin.excalidraw
```

Expected（依序）：
- `flowchart TD` 與 `  demo_client(Client)`
- `13`（連線總數）
- `2`（非同步連線 `e-service-mq`、`e-service-logger`）
- `14`（每個 node 一個 rectangle）
- `13`（每條 edge 一個 arrow）

數字不符時，先打開快照檔找出原因，不可以直接接受。

- [ ] **Step 4: 不更新快照再跑一次**

Run: `npx playwright test e2e/presets-exports.spec.ts`
Expected: `16 passed`

- [ ] **Step 5: 確認 lint**

Run: `npm run lint`
Expected: 成功

- [ ] **Step 6: Commit**

```bash
git add e2e/presets-exports.spec.ts e2e/presets-exports.spec.ts-snapshots
git commit -m "test: characterize presets and diagram exports"
```

---

### Task 7: 截圖基準

**Files:**
- Test: `frontend/e2e/visual.spec.ts`
- Snapshot（自動產生）：`frontend/e2e/visual.spec.ts-snapshots/*-darwin.png`

**Interfaces:**
- Consumes：`cleanAnalysis`，以及 `mockAnalysis`、`openApp`、`loadPreset`、`settleForScreenshot`（Task 1）
- Produces：6 張主題截圖 × 2 個 project。PR 2 會用它們檢查自己 host 字型之後外觀是否不變

- [ ] **Step 1: 撰寫 `e2e/visual.spec.ts`**

```ts
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
```

- [ ] **Step 2: 產生截圖基準**

Run: `npx playwright test e2e/visual.spec.ts --update-snapshots`
Expected: 全部通過，`e2e/visual.spec.ts-snapshots/` 下產生 12 張 `*-darwin.png`。

- [ ] **Step 3: 人工檢查截圖**

用 Read 工具打開 `basic-preset-light-desktop-chromium-no-sw-darwin.png` 與 `params-panel-dark-desktop-webkit-darwin.png`，確認：
- 手寫字型已經載入（Sidebar 標題的 `ArchitectMind` 是 Caveat 字型，不是系統字型）。
- Basic preset 完整顯示在畫布內。
- 沒有停在動畫中間的畫面。
- 深色主題的背景是深色。

- [ ] **Step 4: 確認截圖穩定**

Run: `npx playwright test e2e/visual.spec.ts --repeat-each=3`
Expected: `36 passed`

如果有截圖不穩定，找出原因（例如 hover 狀態、動畫還沒結束）並修正測試的等待條件，再回到 Step 2 重新產生基準。不可以調高 `maxDiffPixelRatio`。

- [ ] **Step 5: 確認 lint**

Run: `npm run lint`
Expected: 成功

- [ ] **Step 6: Commit**

```bash
git add e2e/visual.spec.ts e2e/visual.spec.ts-snapshots
git commit -m "test: add visual baselines for light and dark themes"
```

---

### Task 8: 真實後端 smoke test、文件與整體驗證

**Files:**
- Test: `frontend/e2e/real-backend.spec.ts`
- Modify: `CLAUDE.md`（repo 根目錄）

**Interfaces:**
- Consumes：`openApp`、`loadPreset`、`analysisSummary`（Task 1）
- Produces：無

- [ ] **Step 1: 撰寫 `e2e/real-backend.spec.ts`**

```ts
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
```

- [ ] **Step 2: 確認預設執行時不會跑到真實後端測試**

Run: `npx playwright test --list | grep -c real-backend`
Expected: `0`

- [ ] **Step 3: 執行真實後端測試（需要 8080 沒有被占用）**

Run: `lsof -iTCP:8080 -sTCP:LISTEN -n -P`

- **沒有輸出**：執行 `E2E_REAL_BACKEND=1 npx playwright test --project=real-backend`，Expected: `1 passed`。
- **有輸出**（例如目前的 OrbStack）：不要停止使用者的程式。跳過這一步，在 PR 描述註明「真實後端測試因 8080 被占用而未執行」，交給使用者決定何時執行。

- [ ] **Step 4: 更新 `CLAUDE.md`**

在 `### Frontend (React + Vite + TypeScript)` 的指令清單最後加上：

```markdown
- `cd frontend && npm run test:e2e` - Playwright regression suite on the production build (Chromium + WebKit, API mocked)
- `cd frontend && E2E_REAL_BACKEND=1 npx playwright test --project=real-backend` - Smoke test against the Go backend (port 8080 must be free)
```

在 `## Adding Features` 之前加上：

```markdown
## E2E Regression Baseline

- `frontend/e2e/` characterizes the existing desktop behavior. Do not edit these tests to make a change pass unless the change is listed in §9.3 of `docs/superpowers/specs/2026-09-13-pwa-canvas-persistence-design.md`, and explain it in the commit message.
- Snapshot and screenshot baselines are generated on macOS (`*-darwin.*`). Regenerate them with `npx playwright test --update-snapshots` only for intentional changes, and review the new files before committing.
```

- [ ] **Step 5: 完整驗證**

Run: `npm run lint && npm run build && npm run test:e2e`
Expected：lint、build 成功，Playwright `84 passed`。

- [ ] **Step 6: 確認整組測試穩定**

Run: `npx playwright test --repeat-each=3`
Expected: `252 passed`。有任何不穩定的測試都要先修正等待條件，不可以加 retries。

- [ ] **Step 7: 確認沒有修改應用程式**

Run: `git -C .. diff main --stat -- frontend/src && git -C .. status --short`
Expected：
- 第一個指令沒有輸出。
- `status` 只列出這個 task 還沒 commit 的 `CLAUDE.md` 與 `frontend/e2e/real-backend.spec.ts`。

- [ ] **Step 8: Commit**

```bash
git -C .. add CLAUDE.md frontend/e2e/real-backend.spec.ts
git -C .. commit -m "test: add real backend smoke test and document e2e workflow"
```

- [ ] **Step 9: 收尾**

使用 superpowers:finishing-a-development-branch。

push 與開 PR 前要先詢問使用者。PR 描述要包含：
- 用了 `test.skip` 的 WebKit 案例與原因（如果有）。
- 真實後端測試有沒有執行。
- 截圖基準是在 macOS 產生的。
