# PWA 與畫布持久化（PR 2）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 ArchitectMind 可以安裝成 PWA、離線開啟，並把所有 tab 的畫布內容與系統參數保存在 localStorage；同時讓 PR 1 的回歸測試除了 spec §9.3 列出的變更之外全部維持不變。

**Architecture:**
- **PWA 外殼**：`vite-plugin-pwa`（Workbox `generateSW`、`registerType: 'prompt'`），字型改用 `@fontsource-variable/caveat` 跟著 precache。
- **持久化**：純函式模組 `src/persistence/`（zod schema、serializer、storage I/O）＋ `useWorkspacePersistence`（debounce、dirty check、flush）＋ `useCanvasTabs`（還原、snapshot 標記 tabId）。
- **UI**：`Toast`、`PersistenceNotice`、`PwaUpdatePrompt`，離線時 `Canvas` 暫停分析。
- **測試**：vitest + Testing Library 做單元測試；Playwright 新增 `desktop-chromium-sw` project 與 §9.3 的 E2E。

**Tech Stack:** React 19、Vite 7、TypeScript 5.9、vite-plugin-pwa 1.3.0、zod 4、vitest 5、jsdom 30、@testing-library/react 16、Playwright 1.63.0

**Spec:** `docs/superpowers/specs/2026-09-13-pwa-canvas-persistence-design.md`（PR 2 = §5～§7、§9.1 其餘項目、§9.3、§9.4、§10、§11；分期見 §14）

**分支：** `feat/pwa-persistence`，從 `test/e2e-regression-baseline`（`5439f40`）開出。

## Global Constraints

- **spec 是最終依據**：本計畫與 spec 衝突時以 spec 為準，並回報衝突。
- **回歸基準不可隨意修改**：PR 1 的 `frontend/e2e/*.spec.ts`、快照與截圖基準，只有 §9.3 列出的預期變更，以及本計畫明確列出的例外（Task 2 的 SW project 設定、`openApp` 等待 SW 接管、複製快照給新 project）可以動，而且要在 commit 訊息說明。
- **不可放寬斷言**：不能為了讓測試通過刪掉斷言、改成沒意義的比對、加 retries、調高 `maxDiffPixelRatio` 或遮罩區域。
- **版本**：`vite-plugin-pwa` 1.3.0、`workbox-window` 7.4.1、`zod` ^4（4.6.5）、`@fontsource-variable/caveat` 5.3.0、`vitest` 5.0.0、`@vitest/coverage-v8` 5.0.0（與 vitest 完全相同）、`jsdom` 30.0.1、`@testing-library/react` 16.3.3、`@testing-library/dom` 10.4.2。Icons 用 `npx @vite-pwa/assets-generator@1` 產生，不裝進依賴。
- **儲存格式**：key `architectmind:workspace`、備份 key `architectmind:workspace:corrupt`、`version: 1`、debounce 500ms。
- **UI 文案**：一律使用 spec 的英文原文，逐字照抄。
- **lint**：`npx eslint src e2e playwright.config.ts vitest.config.ts` 對新增或修改的檔案必須乾淨；`npm run lint` 只能出現 `src/components/Sidebar.tsx` 第 10、81 行原本的 2 個錯誤。`eslint-plugin-react-hooks` 7.0.1 啟用了 `refs`、`set-state-in-effect`、`purity`、`immutability` 等規則：不可在 render 時讀寫 ref、不可在 effect 本體同步呼叫 setState、不可停用任何規則。
- **程式風格**：不可變（不修改參數、不對陣列 `push`）、不 `console.log`、檔案 ≤ 400 行、函式 < 50 行。`Canvas.tsx` 只做 spec §5.5 要求的最小修改。
- **覆蓋率門檻 80%**：`src/persistence/**`、`src/utils/nodeId.ts`、`src/hooks/useCanvasTabs.ts`、`src/hooks/useWorkspacePersistence.ts`、`src/hooks/useOnlineStatus.ts`、`src/components/PwaUpdatePrompt.tsx`、`src/components/Toast.tsx`、`src/components/PersistenceNotice.tsx`、`src/notices/selectNotice.ts`、`src/theme/themePreference.ts`。
- **Playwright 執行方式**：只能透過 runner，加 `--reporter=line --global-timeout=900000`（重複跑時 `1800000`）；不可寫會自己開瀏覽器的腳本；不可用 `--update-snapshots`，除非步驟明確要求。執行前 `lsof -iTCP:4173 -sTCP:LISTEN` 必須沒有輸出。
- **Commit**：訊息格式 `<type>: <description>`，不加 `Co-Authored-By`；不 push。

## 已驗證的事實（2026-09-14）

| 項目 | 事實 |
| --- | --- |
| 分支起點 | `5439f40`，完整 e2e 87 passed / 1 skipped（WebKit 連線測試），`go test` 通過 |
| `vite-plugin-pwa` 註冊錯誤 | `register.js` 以 `wb.register(...).then(...).catch((e) => onRegisterError?.(e))` 包住註冊；Playwright `serviceWorkers: 'block'` 讓 `register` 回傳 `undefined`，`workbox-window` 讀 `_registration.waiting` 拋錯，會被這個 catch 接住，不會變成 `pageerror` |
| `useRegisterSW` | `virtual:pwa-register/react`，預設 `immediate = true`，回傳 `{ needRefresh: [boolean, setter], offlineReady: [boolean, setter], updateServiceWorker(reloadPage?) }` |
| Playwright SW 封鎖警告 | `Service Worker registration blocked by Playwright`，PR 1 的 `collectConsoleProblems` 已忽略 |
| 主題背景色（`--bg-primary`） | light `#fafaf8`、dark `#1e1e1e`、warm `#EBE4D1`、dream `#F5F3FF`、cyberpunk `#0a0a0c`（`src/index.css` 第 4、21、38、55、72 行） |
| `Canvas.tsx` | 第 43–47 行 `nodeIdCounter` / `generateNodeId`；第 49–55 行 `CanvasProps`；第 106 行 `systemParams` state；第 198–228 行 history effect（`onStateChange` 在第 225–227 行）；第 908–921 行自動分析 effect；第 1267 行開始是分析摘要區塊 |
| Basic preset | 14 nodes / 13 edges，`demo-service` 的 label 是 `Service` |
| 本機 8080 | 被 OrbStack 占用，真實後端測試不執行 |

## File Structure

```text
frontend/
├── index.html                         # Task 1：移除 Google Fonts，加 meta 與 apple-touch-icon
├── vite.config.ts                     # Task 1：VitePWA
├── vitest.config.ts                   # Task 3（新增）
├── tsconfig.app.json                  # Task 1：types 加 vite-plugin-pwa/react
├── tsconfig.node.json                 # Task 3：include 加 vitest.config.ts
├── playwright.config.ts               # Task 2：desktop-chromium-sw project
├── public/                            # Task 1：產生的 icons
├── e2e/
│   ├── support/app.ts                 # Task 2：openApp 等待 SW 接管、isHandFontLoaded；Task 8：persistence helper
│   ├── pwa.spec.ts                    # Task 1（新增）
│   ├── offline-shell.spec.ts          # Task 2（新增，只在 SW project 執行）
│   ├── persistence.spec.ts            # Task 8（新增）
│   ├── storage-notices.spec.ts        # Task 9（新增）
│   ├── theme-color.spec.ts            # Task 9（新增）
│   └── offline-analysis.spec.ts       # Task 10（新增）
└── src/
    ├── main.tsx                       # Task 1：import 字型
    ├── index.css                      # Task 1：--font-hand
    ├── App.tsx                        # Task 7、8、9、10、11
    ├── test/setup.ts                  # Task 3（新增）
    ├── test/fakeStorage.ts            # Task 5（新增）
    ├── test/pwaRegisterMock.ts        # Task 11（新增）
    ├── utils/nodeId.ts                # Task 3（新增）
    ├── persistence/
    │   ├── workspaceSchema.ts         # Task 4
    │   ├── workspaceSerializer.ts      # Task 4
    │   ├── workspaceStorage.ts        # Task 5
    │   └── initialWorkspace.ts        # Task 7
    ├── hooks/
    │   ├── useWorkspacePersistence.ts # Task 6
    │   ├── useCanvasTabs.ts           # Task 7
    │   └── useOnlineStatus.ts         # Task 10
    ├── theme/
    │   ├── themePreference.ts         # Task 9
    │   └── themeColor.ts              # Task 9
    ├── notices/selectNotice.ts        # Task 9
    └── components/
        ├── Canvas.tsx                 # Task 3、8、10
        ├── Toast.tsx                  # Task 9
        ├── PersistenceNotice.tsx      # Task 9
        └── PwaUpdatePrompt.tsx        # Task 11
vercel.json                            # Task 1：headers
CLAUDE.md、README.md                   # Task 1、12
```

## 測試數量追蹤

每個 task 的「完整 e2e」預期值（`npx playwright test --reporter=line --global-timeout=900000`）：

| 完成到 | chromium-no-sw | webkit | chromium-sw | 合計 |
| --- | --- | --- | --- | --- |
| 起點 | 44 passed | 43 passed + 1 skipped | — | 87 passed / 1 skipped |
| Task 1 | 47 | 46 + 1 skipped | — | 93 / 1 |
| Task 2 | 47 | 46 + 1 skipped | 43 | 136 / 1 |
| Task 8 | 53 | 52 + 1 skipped | 49 | 154 / 1 |
| Task 9 | 58 | 57 + 1 skipped | 54 | 169 / 1 |
| Task 10 | 59 | 58 + 1 skipped | 55 | 172 / 1 |

Task 3～7、11、12 不新增 e2e 測試，沿用上一列的數字。

---

以下所有指令都在 `frontend/` 執行，除非另外註明。

### Task 1: PWA 外殼與自己 host 的字型

**Files:**
- Create: `frontend/e2e/pwa.spec.ts`、`frontend/public/` 下的 icons（產生）
- Modify: `frontend/package.json`、`frontend/package-lock.json`、`frontend/vite.config.ts`、`frontend/index.html`、`frontend/src/main.tsx`、`frontend/src/index.css:3`、`frontend/tsconfig.app.json`、`vercel.json`、`CLAUDE.md`

**Interfaces:**
- Consumes：`mockAnalysis`、`openApp`（`e2e/support/app.ts`）、`cleanAnalysis`
- Produces：`/manifest.webmanifest`、`/sw.js`、`public/` icons、字型族名 `Caveat Variable`；後續 task 依賴 `vite-plugin-pwa` 已安裝、`tsconfig.app.json` 已含 `vite-plugin-pwa/react` 型別

- [ ] **Step 1: 確認分支並 commit 本計畫**

Run: `git -C .. branch --show-current && git -C .. status --short`
Expected: `feat/pwa-persistence`；唯一未 commit 的是 `docs/superpowers/plans/2026-09-14-pwa-canvas-persistence.md`。

```bash
git -C .. add docs/superpowers/plans/2026-09-14-pwa-canvas-persistence.md
git -C .. commit -m "docs: add PWA and canvas persistence implementation plan"
```

- [ ] **Step 2: 先寫會失敗的 E2E `e2e/pwa.spec.ts`**

```ts
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
```

- [ ] **Step 3: 確認測試先失敗**

Run: `npx playwright test e2e/pwa.spec.ts --reporter=line --global-timeout=900000`
Expected: `6 failed`（兩個 project 各 3 個）：找不到 manifest link、找不到 meta、字型仍來自 Google Fonts。

- [ ] **Step 4: 安裝套件**

```bash
npm install --save-dev --save-exact vite-plugin-pwa@1.3.0
npm install --save-exact @fontsource-variable/caveat@5.3.0 workbox-window@7.4.1
```

Expected：`package.json` 的 `devDependencies` 有 `"vite-plugin-pwa": "1.3.0"`；`dependencies` 有 `"@fontsource-variable/caveat": "5.3.0"`、`"workbox-window": "7.4.1"`。

- [ ] **Step 5: 產生 icons**

Run: `npx --yes @vite-pwa/assets-generator@1 --preset minimal-2023 public/favicon.svg && ls public`
Expected：`public/` 有 `apple-touch-icon-180x180.png`、`favicon.ico`、`favicon.svg`、`maskable-icon-512x512.png`、`pwa-192x192.png`、`pwa-512x512.png`、`pwa-64x64.png`。

- [ ] **Step 6: 改寫 `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'ArchitectMind - System Design Visualizer',
        short_name: 'ArchitectMind',
        description: 'Visualize and validate system design architectures.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#fafaf8',
        background_color: '#fafaf8',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 7: 改寫 `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#fafaf8" />
    <meta name="description" content="Visualize and validate system design architectures." />
    <title>ArchitectMind - System Design Visualizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: 字型改成自己 host**

`src/main.tsx` 第一行加上（其餘不變）：

```ts
import '@fontsource-variable/caveat'
```

`src/index.css` 第 3 行改成：

```css
  --font-hand: 'Caveat Variable', 'Caveat', 'Virgil', 'Comic Neue', cursive;
```

- [ ] **Step 9: 型別、Vercel headers 與文件**

`tsconfig.app.json` 的 `"types": ["vite/client"]` 改成 `"types": ["vite/client", "vite-plugin-pwa/react"]`。

`vercel.json`（repo 根目錄）改成：

```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] },
    { "source": "/manifest.webmanifest", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] }
  ],
  "rewrites": [
    { "source": "/api/topology", "destination": "/api/topology" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

`CLAUDE.md` 的這一行：

```markdown
- The hand-drawn font (Caveat) still loads from Google Fonts, so the screenshot tests need network access.
```

改成：

```markdown
- The hand-drawn font (Caveat) is self-hosted through `@fontsource-variable/caveat` and precached by the service worker, so the suite does not need network access for fonts.
```

- [ ] **Step 10: build 並檢查 precache 清單（spec §10 第 11 項）**

```bash
npm run build 2>&1 | grep -iE "PWA v|precache|will not be precached|error"
grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' dist/sw.js | head -1
grep -oE '[A-Za-z0-9_./-]+\.woff2' dist/sw.js | head -3
```

Expected：
- build 成功，輸出有 `PWA v1.3.0` 與 `precache` 那一行，沒有 `will not be precached`。
- 第二個指令印出一個 `assets/index-*.js`。
- 第三個指令至少印出一個 `.woff2`。

任何一項不符就停下來回報，不要調整 `maximumFileSizeToCacheInBytes`。

- [ ] **Step 11: 確認新測試通過**

Run: `npx playwright test e2e/pwa.spec.ts --reporter=line --global-timeout=900000`
Expected: `6 passed`

如果 `meta[name="theme-color"]` 出現兩個（plugin 自動注入），回報 DONE_WITH_CONCERNS，不要刪 `index.html` 裡的那一個。

- [ ] **Step 12: 回歸測試（含截圖，spec §9.3 第 7 項）**

Run: `lsof -iTCP:4173 -sTCP:LISTEN -n -P; npx playwright test --reporter=line --global-timeout=900000`
Expected: `93 passed`、`1 skipped`。

`visual.spec.ts` 的截圖如果超過 `maxDiffPixelRatio: 0.01`：不可更新基準、不可放寬門檻。停下來回報 DONE_WITH_CONCERNS，附上 `test-results/` 裡的 `*-diff.png` 路徑，由人工確認字型差異（spec §9.2）。

- [ ] **Step 13: lint 並 commit**

```bash
npx eslint e2e playwright.config.ts vite.config.ts
npm run lint 2>&1 | grep -cE " error "
git -C .. add vercel.json CLAUDE.md frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/index.html frontend/src/main.tsx frontend/src/index.css frontend/tsconfig.app.json frontend/public frontend/e2e/pwa.spec.ts
git -C .. commit -m "feat: add installable PWA shell with self-hosted Caveat font"
```

Expected：eslint 沒有輸出；error 數量 `2`；`git -C .. status --short` 在 commit 後是空的。

---

### Task 2: 讓回歸測試也在 service worker 接管的情況下執行

**Files:**
- Create: `frontend/e2e/offline-shell.spec.ts`、三份複製的文字快照（見 Step 4）
- Modify: `frontend/playwright.config.ts`、`frontend/e2e/support/app.ts`（`openApp`，新增 `isHandFontLoaded`）、`frontend/e2e/pwa.spec.ts`（改用 `isHandFontLoaded`）

**Interfaces:**
- Consumes：Task 1 產生的 `/sw.js` 與字型族名 `Caveat Variable`
- Produces：
  - Playwright project `desktop-chromium-sw`（`serviceWorkers: 'allow'`，不跑 `visual.spec.ts` 與 `real-backend.spec.ts`）
  - `openApp(page)`：在 SW project 會等 SW 就緒並重新整理，直到 `navigator.serviceWorker.controller` 不是 `null`
  - `isHandFontLoaded(page): Promise<boolean>`

**為什麼可以改 PR 1 的基準檔：** spec §9.2 規定 `desktop-chromium-sw` 在 PR 2 加入，而且要「確認 SW 接管之後行為一樣」。第一次造訪時頁面還沒被 SW 接管，所以 `openApp` 必須多一次重新整理。這一步只影響 SW project，其他 project 的行為與斷言完全不變。

- [ ] **Step 1: 在 `e2e/support/app.ts` 加上字型 helper，並讓 `pwa.spec.ts` 使用它**

在 `app.ts` 最後加上：

```ts
export async function isHandFontLoaded(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].some(
      (face) => face.family.replace(/["']/g, '') === 'Caveat Variable' && face.status === 'loaded',
    )
  })
}
```

`pwa.spec.ts` 的 `self-hosts the hand-drawn font` 測試中，把 `const handFontLoaded = await page.evaluate(...)` 整段換成：

```ts
  const handFontLoaded = await isHandFontLoaded(page)
```

同時刪掉 `HAND_FONT_FAMILY` 常數，並在 import 加上 `isHandFontLoaded`：

```ts
import { isHandFontLoaded, mockAnalysis, openApp } from './support/app'
```

- [ ] **Step 2: 寫 `e2e/offline-shell.spec.ts`**

```ts
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
```

- [ ] **Step 3: 在 `playwright.config.ts` 新增 SW project**

把 `const REAL_BACKEND_SPEC = /real-backend\.spec\.ts$/` 下面加上兩行：

```ts
const VISUAL_SPEC = /visual\.spec\.ts$/
const OFFLINE_SHELL_SPEC = /offline-shell\.spec\.ts$/
```

把 `mockedProjects` 改成：

```ts
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
```

- [ ] **Step 4: 複製文字快照給新 project（不可用 `--update-snapshots`）**

```bash
cp e2e/analysis.spec.ts-snapshots/basic-preset-request-desktop-chromium-no-sw-darwin.json e2e/analysis.spec.ts-snapshots/basic-preset-request-desktop-chromium-sw-darwin.json
cp e2e/presets-exports.spec.ts-snapshots/basic-preset-desktop-chromium-no-sw-darwin.mmd e2e/presets-exports.spec.ts-snapshots/basic-preset-desktop-chromium-sw-darwin.mmd
cp e2e/presets-exports.spec.ts-snapshots/basic-preset-desktop-chromium-no-sw-darwin.excalidraw e2e/presets-exports.spec.ts-snapshots/basic-preset-desktop-chromium-sw-darwin.excalidraw
```

- [ ] **Step 5: 確認離線外殼測試先失敗**

Run: `npx playwright test e2e/offline-shell.spec.ts --project=desktop-chromium-sw --reporter=line --global-timeout=900000`
Expected: `2 failed`（第一次造訪頁面還沒被 SW 接管，`controller` 是 `null`；離線重新整理打不開）。

- [ ] **Step 6: 讓 `openApp` 等 SW 接管**

`app.ts` 第一行改成：

```ts
import { expect, test, type Download, type Locator, type Page } from '@playwright/test'
```

把 `openApp` 換成下面兩個函式：

```ts
export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  if (test.info().project.use.serviceWorkers === 'allow') {
    await waitForServiceWorkerControl(page)
  }
  await expect(page.getByText('Untitled 1', { exact: true })).toBeVisible()
}

async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
}
```

- [ ] **Step 7: 確認離線外殼測試通過**

Run: `npx playwright test e2e/offline-shell.spec.ts --project=desktop-chromium-sw --reporter=line --global-timeout=900000`
Expected: `2 passed`

- [ ] **Step 8: 驗證 spec §9.2 的假設：SW 接管後 `context.route` 仍攔得到 API**

Run: `npx playwright test e2e/analysis.spec.ts --project=desktop-chromium-sw --reporter=line --global-timeout=900000`
Expected: `8 passed`。

如果失敗的原因是 mock 沒有生效（例如出現 `Analysis failed`、`recorder.requests()` 是 0）：假設不成立。8080 被占用，不能改打真實後端，所以依 spec 的備案，在 `desktop-chromium-sw` 的 `testIgnore` 加上 `/analysis\.spec\.ts$/`，把失敗輸出寫進報告，狀態回報 DONE_WITH_CONCERNS（測試總數會改變，由 controller 重新計算）。其他原因造成的失敗，一律照 Global Constraints 處理。

- [ ] **Step 9: 完整回歸測試**

Run: `lsof -iTCP:4173 -sTCP:LISTEN -n -P; npx playwright test --reporter=line --global-timeout=900000`
Expected: `136 passed`、`1 skipped`。

- [ ] **Step 10: 確認 SW project 穩定**

Run: `npx playwright test --project=desktop-chromium-sw --reporter=line --global-timeout=1800000 --repeat-each=3`
Expected: `129 passed`（43 × 3），0 flaky。

- [ ] **Step 11: lint 並 commit**

```bash
npx eslint e2e playwright.config.ts
git -C .. add frontend/playwright.config.ts frontend/e2e/support/app.ts frontend/e2e/pwa.spec.ts frontend/e2e/offline-shell.spec.ts frontend/e2e/analysis.spec.ts-snapshots frontend/e2e/presets-exports.spec.ts-snapshots
git -C .. commit -m "test: run the regression suite with an active service worker" -m "Adds the desktop-chromium-sw project from spec §9.2. openApp now reloads once in that project so the service worker controls the page; other projects are unchanged. Text snapshots for the new project are copies of the chromium-no-sw baselines."
```

Expected：eslint 沒有輸出；commit 後 `git -C .. status --short` 是空的。

---

### Task 3: vitest 基礎設施與 node id 產生器

**Files:**
- Create: `frontend/vitest.config.ts`、`frontend/src/test/setup.ts`、`frontend/src/utils/nodeId.ts`、`frontend/src/utils/nodeId.test.ts`
- Modify: `frontend/package.json`（scripts、devDependencies）、`frontend/package-lock.json`、`frontend/tsconfig.node.json`、`frontend/.gitignore`、`frontend/src/components/Canvas.tsx:26-47`

**Interfaces:**
- Consumes：無
- Produces：
  - `npm test`（`vitest run`）、`npm run test:coverage`（`vitest run --coverage`）
  - `generateNodeId(): string` — 回傳 `node-N`，N 從 1 遞增
  - `seedNodeIdCounter(ids: readonly string[]): void` — 把計數器推進到 `ids` 中 `node-<數字>` 的最大值，不會往回調

- [ ] **Step 1: 安裝測試套件**

```bash
npm install --save-dev --save-exact vitest@5.0.0 @vitest/coverage-v8@5.0.0 jsdom@30.0.1 @testing-library/react@16.3.3 @testing-library/dom@10.4.2
```

- [ ] **Step 2: 設定 vitest**

`package.json` 的 `scripts` 改成：

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test"
},
```

建立 `vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/persistence/**/*.ts',
        'src/utils/nodeId.ts',
        'src/hooks/useCanvasTabs.ts',
        'src/hooks/useWorkspacePersistence.ts',
        'src/hooks/useOnlineStatus.ts',
        'src/components/PwaUpdatePrompt.tsx',
        'src/components/Toast.tsx',
        'src/components/PersistenceNotice.tsx',
        'src/notices/selectNotice.ts',
        'src/theme/themePreference.ts',
      ],
      exclude: ['src/**/*.test.{ts,tsx}'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
```

建立 `src/test/setup.ts`（沒有開啟 vitest globals，Testing Library 不會自動卸載，所以在這裡清理，避免上一個測試還掛著的 hook 在下一個測試寫入 storage）：

```ts
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

`tsconfig.node.json` 的 `"include": ["vite.config.ts"]` 改成 `"include": ["vite.config.ts", "vitest.config.ts"]`。

`frontend/.gitignore` 最後加上：

```gitignore

# Vitest
/coverage
```

- [ ] **Step 3: 先寫會失敗的測試 `src/utils/nodeId.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

type NodeIdModule = typeof import('./nodeId')

describe('nodeId', () => {
  let nodeId: NodeIdModule

  beforeEach(async () => {
    vi.resetModules()
    nodeId = await import('./nodeId')
  })

  it('starts at node-1 and increments', () => {
    expect(nodeId.generateNodeId()).toBe('node-1')
    expect(nodeId.generateNodeId()).toBe('node-2')
  })

  it('continues after the highest node-N id when seeded', () => {
    nodeId.seedNodeIdCounter(['node-3', 'node-12', 'demo-client'])

    expect(nodeId.generateNodeId()).toBe('node-13')
  })

  it('keeps counting from the current value when no id matches', () => {
    nodeId.generateNodeId()
    nodeId.seedNodeIdCounter(['demo-client', 'node-x', 'edge-node-9'])

    expect(nodeId.generateNodeId()).toBe('node-2')
  })

  it('never moves the counter backwards', () => {
    nodeId.seedNodeIdCounter(['node-20'])
    nodeId.seedNodeIdCounter(['node-5'])

    expect(nodeId.generateNodeId()).toBe('node-21')
  })
})
```

Run: `npx vitest run src/utils/nodeId.test.ts`
Expected: FAIL，錯誤是找不到 `./nodeId`。

- [ ] **Step 4: 實作 `src/utils/nodeId.ts`**

```ts
const NODE_ID_PATTERN = /^node-(\d+)$/

let nodeIdCounter = 0

export function generateNodeId(): string {
  nodeIdCounter += 1
  return `node-${nodeIdCounter}`
}

export function seedNodeIdCounter(ids: readonly string[]): void {
  const highest = ids.reduce((max, id) => {
    const match = NODE_ID_PATTERN.exec(id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  nodeIdCounter = Math.max(nodeIdCounter, highest)
}
```

Run: `npx vitest run src/utils/nodeId.test.ts`
Expected: `4 passed`

- [ ] **Step 5: `Canvas.tsx` 改用共用的產生器**

刪掉 `Canvas.tsx` 第 43–47 行：

```ts
let nodeIdCounter = 0
function generateNodeId(): string {
  nodeIdCounter += 1
  return `node-${nodeIdCounter}`
}
```

並在第 26 行 `import { analyzeTopology } from '../api/topologyApi'` 下面加上：

```ts
import { generateNodeId } from '../utils/nodeId'
```

`Canvas.tsx` 其他地方不變（`duplicateNodes`、`pasteFromClipboard`、`onDrop` 會自動使用匯入的函式）。

- [ ] **Step 6: 覆蓋率、型別與回歸測試**

```bash
npm test
npx vitest run --coverage --coverage.include=src/utils/nodeId.ts
npm run build
npx playwright test e2e/editing.spec.ts e2e/app-shell.spec.ts --reporter=line --global-timeout=900000
```

Expected：
- `npm test`：`4 passed`。
- 覆蓋率：`nodeId.ts` 100%，沒有 threshold 錯誤。（完整的 `npm run test:coverage` 從 Task 7 開始才會通過，因為 `useCanvasTabs.ts` 在那之前沒有測試。）
- build 成功（`tsc -b` 也會檢查測試檔的型別）。
- Playwright：`45 passed`（editing 8 個 + app-shell 7 個，× 3 個 project），新 node 仍是 `node-1`、`node-2`。

- [ ] **Step 7: lint 並 commit**

```bash
npx eslint src/utils src/test vitest.config.ts
npm run lint 2>&1 | tail -1
git -C .. add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/tsconfig.node.json frontend/.gitignore frontend/src/test/setup.ts frontend/src/utils/nodeId.ts frontend/src/utils/nodeId.test.ts frontend/src/components/Canvas.tsx
git -C .. commit -m "refactor: move node id generation to a tested utility"
```

Expected：第一個指令沒有輸出；第二個印出 `✖ 9 problems (2 errors, 7 warnings)`；commit 後工作目錄乾淨。

---

### Task 4: workspace schema 與 serializer（純函式）

**Files:**
- Create: `frontend/src/persistence/workspaceSchema.ts`、`frontend/src/persistence/workspaceSchema.test.ts`、`frontend/src/persistence/workspaceSerializer.ts`、`frontend/src/persistence/workspaceSerializer.test.ts`
- Modify: `frontend/package.json`、`frontend/package-lock.json`（zod）

**Interfaces:**
- Consumes：`SystemParams`（`src/types/topology.ts`）、React Flow 的 `Node`、`Edge` 型別
- Produces（`workspaceSchema.ts`）：
  - `WORKSPACE_VERSION = 1`
  - `paramsObjectSchema`（zod object，8 個欄位）、`paramsSchema`（丟掉無效欄位，無效或缺少時回傳 `{}`，輸出型別 `SystemParams`）
  - `workspaceSchema`（`safeParse` 輸出 `PersistedWorkspace`；`activeTabId` 找不到時改用第一個 tab）
  - `type PersistedWorkspace`、`type PersistedTab`
  - `type VersionStatus = 'current' | 'newer' | 'invalid'`、`classifyVersion(candidate: unknown): VersionStatus`
- Produces（`workspaceSerializer.ts`）：
  - `interface SerializableTab { id; name; nodes: readonly Node[]; edges: readonly Edge[]; params: SystemParams }`（全部 readonly）
  - `interface CanvasSnapshot { tabId; nodes; edges; params }`（全部 readonly）
  - `interface SerializedWorkspace { version: 1; activeTabId: string; tabs: readonly SerializedTab[] }`
  - `toPersistedWorkspace(tabs: readonly SerializableTab[], activeTabId: string, snapshot: CanvasSnapshot | null): SerializedWorkspace`

- [ ] **Step 1: 安裝 zod**

Run: `npm install zod@^4.6.5`
Expected：`package.json` 的 `dependencies` 有 `"zod": "^4.6.5"`。

- [ ] **Step 2: 先寫 schema 測試 `src/persistence/workspaceSchema.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import type { SystemParams } from '../types/topology'
import { classifyVersion, paramsObjectSchema, paramsSchema, workspaceSchema } from './workspaceSchema'

type Defined<T> = { [K in keyof T]-?: Exclude<T[K], undefined> }
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

const validWorkspace = {
  version: 1,
  activeTabId: 'tab-2',
  tabs: [
    {
      id: 'tab-1',
      name: 'Untitled 1',
      nodes: [
        {
          id: 'node-1',
          type: 'architecture',
          width: 160,
          position: { x: 10, y: 20 },
          data: { label: 'Client', componentType: 'client', properties: {} },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          sourceHandle: 'right-source',
          type: 'handdrawn',
          style: { strokeWidth: 2 },
          data: { protocol: 'http' },
        },
      ],
      params: { dau: 1000000, availability: '99.9%' },
    },
    { id: 'tab-2', name: 'Untitled 2', nodes: [], edges: [], params: {} },
  ],
}

describe('workspaceSchema', () => {
  it('accepts a valid workspace and keeps unknown node and edge fields', () => {
    const result = workspaceSchema.safeParse(validWorkspace)

    expect(result.success).toBe(true)
    expect(result.data?.activeTabId).toBe('tab-2')
    expect(result.data?.tabs[0].nodes[0]).toMatchObject({ type: 'architecture', width: 160 })
    expect(result.data?.tabs[0].edges[0]).toMatchObject({
      sourceHandle: 'right-source',
      type: 'handdrawn',
      style: { strokeWidth: 2 },
    })
    expect(result.data?.tabs[0].params).toEqual({ dau: 1000000, availability: '99.9%' })
  })

  it('rejects a workspace without tabs', () => {
    expect(workspaceSchema.safeParse({ ...validWorkspace, tabs: [] }).success).toBe(false)
    expect(workspaceSchema.safeParse({ version: 1, activeTabId: 'tab-1' }).success).toBe(false)
  })

  it('rejects a node without a position', () => {
    const tab = { id: 'tab-1', name: 'Untitled 1', nodes: [{ id: 'node-1', data: {} }], edges: [], params: {} }

    expect(workspaceSchema.safeParse({ version: 1, activeTabId: 'tab-1', tabs: [tab] }).success).toBe(false)
  })

  it('drops invalid params and keeps valid ones', () => {
    const stored = JSON.parse(
      JSON.stringify({ dau: 500, readWriteRatio: Number.NaN, peakQPS: 'fast', latencyTarget: 42, availability: '99.99%' }),
    )

    expect(paramsSchema.parse(stored)).toEqual({ dau: 500, availability: '99.99%' })
    expect(
      paramsSchema.parse({ avgQPS: Number.NaN, storageGB: Number.POSITIVE_INFINITY, dailyGrowthGB: 3 }),
    ).toEqual({ dailyGrowthGB: 3 })
  })

  it('defaults missing or malformed params to an empty object', () => {
    expect(paramsSchema.parse(undefined)).toEqual({})
    expect(paramsSchema.parse('not an object')).toEqual({})
  })

  it('falls back to the first tab when activeTabId does not exist', () => {
    const result = workspaceSchema.parse({ ...validWorkspace, activeTabId: 'missing' })

    expect(result.activeTabId).toBe('tab-1')
  })

  it('classifies stored versions', () => {
    expect(classifyVersion({ version: 1 })).toBe('current')
    expect(classifyVersion({ version: 2 })).toBe('newer')
    expect(classifyVersion({ version: 0 })).toBe('invalid')
    expect(classifyVersion({ version: '1' })).toBe('invalid')
    expect(classifyVersion({ version: 1.5 })).toBe('invalid')
    expect(classifyVersion({})).toBe('invalid')
    expect(classifyVersion(null)).toBe('invalid')
  })

  it('keeps the params schema fields in sync with SystemParams', () => {
    const sameShape: Same<Defined<z.infer<typeof paramsObjectSchema>>, Defined<SystemParams>> = true

    expect(sameShape).toBe(true)
    expect(Object.keys(paramsObjectSchema.shape).sort()).toEqual([
      'availability',
      'avgQPS',
      'dailyGrowthGB',
      'dau',
      'latencyTarget',
      'peakQPS',
      'readWriteRatio',
      'storageGB',
    ])
  })
})
```

Run: `npx vitest run src/persistence/workspaceSchema.test.ts`
Expected: FAIL，找不到 `./workspaceSchema`。

- [ ] **Step 3: 實作 `src/persistence/workspaceSchema.ts`**

```ts
import { z } from 'zod'
import type { SystemParams } from '../types/topology'

export const WORKSPACE_VERSION = 1

const optionalNumber = z.number().optional().catch(undefined)
const optionalText = z.string().optional().catch(undefined)

export const paramsObjectSchema = z.object({
  dau: optionalNumber,
  peakQPS: optionalNumber,
  avgQPS: optionalNumber,
  storageGB: optionalNumber,
  dailyGrowthGB: optionalNumber,
  readWriteRatio: optionalNumber,
  latencyTarget: optionalText,
  availability: optionalText,
})

function withoutUndefined(params: z.infer<typeof paramsObjectSchema>): SystemParams {
  // Keys are limited to SystemParams by paramsObjectSchema, so the cast only narrows the value types.
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)) as SystemParams
}

export const paramsSchema = paramsObjectSchema.transform(withoutUndefined).catch({})

const nodeSchema = z.looseObject({
  id: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
})

const edgeSchema = z.looseObject({
  id: z.string(),
  source: z.string(),
  target: z.string(),
})

const tabSchema = z.object({
  id: z.string(),
  name: z.string(),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  params: paramsSchema,
})

export const workspaceSchema = z
  .object({
    version: z.literal(WORKSPACE_VERSION),
    activeTabId: z.string().catch(''),
    tabs: z.array(tabSchema).min(1),
  })
  .transform((workspace) => ({
    ...workspace,
    activeTabId: workspace.tabs.some((tab) => tab.id === workspace.activeTabId)
      ? workspace.activeTabId
      : workspace.tabs[0].id,
  }))

export type PersistedWorkspace = z.output<typeof workspaceSchema>
export type PersistedTab = PersistedWorkspace['tabs'][number]

export type VersionStatus = 'current' | 'newer' | 'invalid'

export function classifyVersion(candidate: unknown): VersionStatus {
  if (typeof candidate !== 'object' || candidate === null) return 'invalid'
  const { version } = candidate as { readonly version?: unknown }
  if (version === WORKSPACE_VERSION) return 'current'
  if (typeof version === 'number' && Number.isInteger(version) && version > WORKSPACE_VERSION) return 'newer'
  return 'invalid'
}
```

Run: `npx vitest run src/persistence/workspaceSchema.test.ts`
Expected: `8 passed`

- [ ] **Step 4: 先寫 serializer 測試 `src/persistence/workspaceSerializer.test.ts`**

```ts
import type { Edge, Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { toPersistedWorkspace, type CanvasSnapshot, type SerializableTab } from './workspaceSerializer'

const node = (id: string, extra: Partial<Node> = {}): Node => ({
  id,
  position: { x: 0, y: 0 },
  data: { label: id },
  ...extra,
})
const edge = (id: string, extra: Partial<Edge> = {}): Edge => ({ id, source: 'a', target: 'b', ...extra })

const tabs: readonly SerializableTab[] = [
  { id: 'tab-1', name: 'One', nodes: [node('node-1')], edges: [], params: { dau: 10 } },
  { id: 'tab-2', name: 'Two', nodes: [node('node-2')], edges: [edge('edge-1')], params: {} },
]

describe('toPersistedWorkspace', () => {
  it('writes the version, the active tab and every tab', () => {
    const workspace = toPersistedWorkspace(tabs, 'tab-2', null)

    expect(workspace.version).toBe(1)
    expect(workspace.activeTabId).toBe('tab-2')
    expect(workspace.tabs.map((tab) => tab.name)).toEqual(['One', 'Two'])
    expect(workspace.tabs[0].params).toEqual({ dau: 10 })
  })

  it('uses the canvas snapshot for the active tab', () => {
    const snapshot: CanvasSnapshot = {
      tabId: 'tab-1',
      nodes: [node('node-9')],
      edges: [edge('edge-9')],
      params: { avgQPS: 5 },
    }

    const workspace = toPersistedWorkspace(tabs, 'tab-1', snapshot)

    expect(workspace.tabs[0].nodes.map((item) => item.id)).toEqual(['node-9'])
    expect(workspace.tabs[0].edges.map((item) => item.id)).toEqual(['edge-9'])
    expect(workspace.tabs[0].params).toEqual({ avgQPS: 5 })
    expect(workspace.tabs[1].nodes.map((item) => item.id)).toEqual(['node-2'])
  })

  it('ignores a snapshot that belongs to another tab', () => {
    const snapshot: CanvasSnapshot = { tabId: 'tab-1', nodes: [node('node-9')], edges: [], params: {} }

    const workspace = toPersistedWorkspace(tabs, 'tab-2', snapshot)

    expect(workspace.tabs[0].nodes.map((item) => item.id)).toEqual(['node-1'])
    expect(workspace.tabs[1].nodes.map((item) => item.id)).toEqual(['node-2'])
  })

  it('removes transient node and edge fields and keeps the rest', () => {
    const transientNode = node('node-3', {
      type: 'architecture',
      width: 160,
      selected: true,
      dragging: true,
      resizing: true,
      measured: { width: 160, height: 60 },
    })
    const transientEdge = edge('edge-3', { type: 'handdrawn', selected: true, style: { strokeWidth: 2 } })

    const workspace = toPersistedWorkspace(
      [{ id: 'tab-1', name: 'One', nodes: [transientNode], edges: [transientEdge], params: {} }],
      'tab-1',
      null,
    )

    expect(workspace.tabs[0].nodes[0]).toEqual({
      id: 'node-3',
      position: { x: 0, y: 0 },
      data: { label: 'node-3' },
      type: 'architecture',
      width: 160,
    })
    expect(workspace.tabs[0].edges[0]).toEqual({
      id: 'edge-3',
      source: 'a',
      target: 'b',
      type: 'handdrawn',
      style: { strokeWidth: 2 },
    })
  })

  it('does not modify its inputs', () => {
    const selectedNode = node('node-4', { selected: true })
    const input: readonly SerializableTab[] = [
      { id: 'tab-1', name: 'One', nodes: [selectedNode], edges: [], params: { dau: 1 } },
    ]
    const before = JSON.stringify(input)

    toPersistedWorkspace(input, 'tab-1', null)

    expect(JSON.stringify(input)).toBe(before)
    expect(selectedNode.selected).toBe(true)
  })
})
```

Run: `npx vitest run src/persistence/workspaceSerializer.test.ts`
Expected: FAIL，找不到 `./workspaceSerializer`。

- [ ] **Step 5: 實作 `src/persistence/workspaceSerializer.ts`**

```ts
import type { Edge, Node } from '@xyflow/react'
import type { SystemParams } from '../types/topology'
import { WORKSPACE_VERSION } from './workspaceSchema'

export interface SerializableTab {
  readonly id: string
  readonly name: string
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  readonly params: SystemParams
}

export interface CanvasSnapshot {
  readonly tabId: string
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  readonly params: SystemParams
}

export interface SerializedTab {
  readonly id: string
  readonly name: string
  readonly nodes: readonly Record<string, unknown>[]
  readonly edges: readonly Record<string, unknown>[]
  readonly params: SystemParams
}

export interface SerializedWorkspace {
  readonly version: typeof WORKSPACE_VERSION
  readonly activeTabId: string
  readonly tabs: readonly SerializedTab[]
}

const TRANSIENT_NODE_KEYS: ReadonlySet<string> = new Set(['selected', 'dragging', 'resizing', 'measured'])
const TRANSIENT_EDGE_KEYS: ReadonlySet<string> = new Set(['selected'])

function withoutKeys(value: object, keys: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.has(key)))
}

function applySnapshot(tab: SerializableTab, activeTabId: string, snapshot: CanvasSnapshot | null): SerializableTab {
  if (!snapshot || tab.id !== activeTabId || snapshot.tabId !== activeTabId) return tab
  return { ...tab, nodes: snapshot.nodes, edges: snapshot.edges, params: snapshot.params }
}

function serializeTab(tab: SerializableTab): SerializedTab {
  return {
    id: tab.id,
    name: tab.name,
    nodes: tab.nodes.map((node) => withoutKeys(node, TRANSIENT_NODE_KEYS)),
    edges: tab.edges.map((edge) => withoutKeys(edge, TRANSIENT_EDGE_KEYS)),
    params: { ...tab.params },
  }
}

export function toPersistedWorkspace(
  tabs: readonly SerializableTab[],
  activeTabId: string,
  snapshot: CanvasSnapshot | null,
): SerializedWorkspace {
  return {
    version: WORKSPACE_VERSION,
    activeTabId,
    tabs: tabs.map((tab) => serializeTab(applySnapshot(tab, activeTabId, snapshot))),
  }
}
```

Run: `npx vitest run src/persistence`
Expected: `13 passed`（schema 8、serializer 5）

- [ ] **Step 6: 覆蓋率、型別與 lint**

```bash
npm test
npx vitest run --coverage --coverage.include=src/persistence/workspaceSchema.ts --coverage.include=src/persistence/workspaceSerializer.ts
npm run build
npx eslint src/persistence
```

Expected：`npm test` 17 passed；兩個檔案覆蓋率都 ≥ 80% 且沒有 threshold 錯誤；build 成功；eslint 沒有輸出。

- [ ] **Step 7: Commit**

```bash
git -C .. add frontend/package.json frontend/package-lock.json frontend/src/persistence
git -C .. commit -m "feat: add workspace schema and serializer"
```

---

### Task 5: workspace 的 storage 讀寫

**Files:**
- Create: `frontend/src/persistence/workspaceStorage.ts`、`frontend/src/persistence/workspaceStorage.test.ts`、`frontend/src/test/fakeStorage.ts`

**Interfaces:**
- Consumes：`workspaceSchema`、`classifyVersion`、`PersistedWorkspace`（Task 4）；`toPersistedWorkspace`（只在測試使用）
- Produces（`workspaceStorage.ts`）：
  - `WORKSPACE_STORAGE_KEY = 'architectmind:workspace'`、`CORRUPT_BACKUP_KEY = 'architectmind:workspace:corrupt'`
  - `type LoadResult = { status: 'loaded'; workspace: PersistedWorkspace } | { status: 'empty' } | { status: 'corrupt'; backedUp: boolean } | { status: 'unsupported-version' } | { status: 'unavailable' }`（全部 readonly）
  - `type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' | 'blocked' }`（全部 readonly）
  - `getBrowserStorage(readStorage?: () => Storage): Storage | null` — 存取或寫入 probe key 拋錯時回傳 `null`
  - `loadWorkspace(storage: Storage | null): LoadResult` — 損壞時把原始字串寫到備份 key（冪等）；較新版本不寫入任何 key
  - `saveWorkspace(storage: Storage | null, json: string): SaveResult`
- Produces（`src/test/fakeStorage.ts`，只給測試用）：`createFakeStorage(initial?: Readonly<Record<string, string>>, options?: FakeStorageOptions): Storage`，`FakeStorageOptions = { getError?: Error; setError?: Error; failingSetKey?: string }`

- [ ] **Step 1: 建立測試用的 `src/test/fakeStorage.ts`**

```ts
export interface FakeStorageOptions {
  readonly getError?: Error
  readonly setError?: Error
  /** When set, only writes to this key throw `setError`. */
  readonly failingSetKey?: string
}

export function createFakeStorage(
  initial: Readonly<Record<string, string>> = {},
  options: FakeStorageOptions = {},
): Storage {
  const items = new Map(Object.entries(initial))
  const shouldFailSet = (key: string) =>
    options.setError !== undefined && (options.failingSetKey === undefined || options.failingSetKey === key)

  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => {
      if (options.getError) throw options.getError
      return items.get(key) ?? null
    },
    setItem: (key, value) => {
      if (shouldFailSet(key)) throw options.setError
      items.set(key, String(value))
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
}
```

- [ ] **Step 2: 先寫測試 `src/persistence/workspaceStorage.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createFakeStorage } from '../test/fakeStorage'
import { toPersistedWorkspace } from './workspaceSerializer'
import {
  CORRUPT_BACKUP_KEY,
  WORKSPACE_STORAGE_KEY,
  getBrowserStorage,
  loadWorkspace,
  saveWorkspace,
} from './workspaceStorage'

const quotaError = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError')
const blockedError = () => new DOMException('Access is denied.', 'SecurityError')

const sampleJson = JSON.stringify(
  toPersistedWorkspace(
    [
      {
        id: 'tab-1',
        name: 'Checkout',
        nodes: [{ id: 'node-1', position: { x: 1, y: 2 }, data: { label: 'Client' } }],
        edges: [],
        params: { dau: 42 },
      },
    ],
    'tab-1',
    null,
  ),
)

describe('getBrowserStorage', () => {
  it('returns the storage when a probe write works and leaves no probe behind', () => {
    const storage = createFakeStorage()

    expect(getBrowserStorage(() => storage)).toBe(storage)
    expect(storage.length).toBe(0)
  })

  it('returns null when reading the storage or writing the probe throws', () => {
    expect(
      getBrowserStorage(() => {
        throw blockedError()
      }),
    ).toBeNull()
    expect(getBrowserStorage(() => createFakeStorage({}, { setError: blockedError() }))).toBeNull()
  })
})

describe('loadWorkspace', () => {
  it('reports unavailable storage', () => {
    expect(loadWorkspace(null)).toEqual({ status: 'unavailable' })
    expect(loadWorkspace(createFakeStorage({}, { getError: blockedError() }))).toEqual({ status: 'unavailable' })
  })

  it('reports an empty storage', () => {
    expect(loadWorkspace(createFakeStorage())).toEqual({ status: 'empty' })
  })

  it('loads what saveWorkspace wrote', () => {
    const storage = createFakeStorage()

    expect(saveWorkspace(storage, sampleJson)).toEqual({ ok: true })
    const result = loadWorkspace(storage)

    expect(result.status).toBe('loaded')
    expect(result.status === 'loaded' && result.workspace.tabs[0]).toMatchObject({
      id: 'tab-1',
      name: 'Checkout',
      params: { dau: 42 },
    })
  })

  it('backs up invalid JSON and leaves the main key untouched', () => {
    const storage = createFakeStorage({ [WORKSPACE_STORAGE_KEY]: '{not json' })

    expect(loadWorkspace(storage)).toEqual({ status: 'corrupt', backedUp: true })
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{not json')
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe('{not json')
  })

  it('treats a schema mismatch or an invalid version as corrupt', () => {
    const missingTabs = JSON.stringify({ version: 1, activeTabId: 'tab-1' })
    const stringVersion = JSON.stringify({ ...JSON.parse(sampleJson), version: '1' })

    expect(loadWorkspace(createFakeStorage({ [WORKSPACE_STORAGE_KEY]: missingTabs }))).toEqual({
      status: 'corrupt',
      backedUp: true,
    })
    expect(loadWorkspace(createFakeStorage({ [WORKSPACE_STORAGE_KEY]: stringVersion }))).toEqual({
      status: 'corrupt',
      backedUp: true,
    })
  })

  it('reports a failed backup without touching the main key', () => {
    const storage = createFakeStorage(
      { [WORKSPACE_STORAGE_KEY]: '{not json' },
      { setError: quotaError(), failingSetKey: CORRUPT_BACKUP_KEY },
    )

    expect(loadWorkspace(storage)).toEqual({ status: 'corrupt', backedUp: false })
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe('{not json')
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBeNull()
  })

  it('leaves a workspace from a newer version alone', () => {
    const newer = JSON.stringify({ ...JSON.parse(sampleJson), version: 2 })
    const storage = createFakeStorage({ [WORKSPACE_STORAGE_KEY]: newer })

    expect(loadWorkspace(storage)).toEqual({ status: 'unsupported-version' })
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(newer)
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBeNull()
  })
})

describe('saveWorkspace', () => {
  it('writes the JSON to the workspace key', () => {
    const storage = createFakeStorage()

    expect(saveWorkspace(storage, sampleJson)).toEqual({ ok: true })
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(sampleJson)
  })

  it('reports a full storage as quota', () => {
    expect(saveWorkspace(createFakeStorage({}, { setError: quotaError() }), sampleJson)).toEqual({
      ok: false,
      reason: 'quota',
    })
  })

  it('reports missing or failing storage as unavailable', () => {
    expect(saveWorkspace(null, sampleJson)).toEqual({ ok: false, reason: 'unavailable' })
    expect(saveWorkspace(createFakeStorage({}, { setError: blockedError() }), sampleJson)).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})
```

Run: `npx vitest run src/persistence/workspaceStorage.test.ts`
Expected: FAIL，找不到 `./workspaceStorage`。

- [ ] **Step 3: 實作 `src/persistence/workspaceStorage.ts`**

```ts
import { classifyVersion, workspaceSchema, type PersistedWorkspace } from './workspaceSchema'

export const WORKSPACE_STORAGE_KEY = 'architectmind:workspace'
export const CORRUPT_BACKUP_KEY = 'architectmind:workspace:corrupt'
const PROBE_KEY = 'architectmind:probe'

export type LoadResult =
  | { readonly status: 'loaded'; readonly workspace: PersistedWorkspace }
  | { readonly status: 'empty' }
  | { readonly status: 'corrupt'; readonly backedUp: boolean }
  | { readonly status: 'unsupported-version' }
  | { readonly status: 'unavailable' }

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'quota' | 'unavailable' | 'blocked' }

export function getBrowserStorage(readStorage: () => Storage = () => window.localStorage): Storage | null {
  try {
    const storage = readStorage()
    storage.setItem(PROBE_KEY, PROBE_KEY)
    storage.removeItem(PROBE_KEY)
    return storage
  } catch {
    return null
  }
}

function readRaw(storage: Storage): string | null | undefined {
  try {
    return storage.getItem(WORKSPACE_STORAGE_KEY)
  } catch {
    return undefined
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function backUp(storage: Storage, raw: string): boolean {
  try {
    storage.setItem(CORRUPT_BACKUP_KEY, raw)
    return true
  } catch {
    return false
  }
}

export function loadWorkspace(storage: Storage | null): LoadResult {
  if (!storage) return { status: 'unavailable' }
  const raw = readRaw(storage)
  if (raw === undefined) return { status: 'unavailable' }
  if (raw === null) return { status: 'empty' }

  const candidate = parseJson(raw)
  const version = classifyVersion(candidate)
  if (version === 'newer') return { status: 'unsupported-version' }

  const parsed = version === 'current' ? workspaceSchema.safeParse(candidate) : null
  if (parsed?.success) return { status: 'loaded', workspace: parsed.data }
  return { status: 'corrupt', backedUp: backUp(storage, raw) }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

export function saveWorkspace(storage: Storage | null, json: string): SaveResult {
  if (!storage) return { ok: false, reason: 'unavailable' }
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, json)
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unavailable' }
  }
}
```

Run: `npx vitest run src/persistence/workspaceStorage.test.ts`
Expected: `12 passed`

- [ ] **Step 4: 覆蓋率、型別與 lint**

```bash
npm test
npx vitest run --coverage --coverage.include=src/persistence/workspaceStorage.ts
npm run build
npx eslint src/persistence src/test
```

Expected：`npm test` 29 passed；`workspaceStorage.ts` 覆蓋率 ≥ 80% 且沒有 threshold 錯誤；build 成功；eslint 沒有輸出。

- [ ] **Step 5: Commit**

```bash
git -C .. add frontend/src/persistence/workspaceStorage.ts frontend/src/persistence/workspaceStorage.test.ts frontend/src/test/fakeStorage.ts
git -C .. commit -m "feat: add workspace storage loading and saving"
```

---

### Task 6: `useWorkspacePersistence`（debounce、dirty check、flush）

**Files:**
- Create: `frontend/src/hooks/useWorkspacePersistence.ts`、`frontend/src/hooks/useWorkspacePersistence.test.ts`

**Interfaces:**
- Consumes：`saveWorkspace`、`SaveResult`（Task 5）；`SerializedWorkspace`（Task 4）；`createFakeStorage`（Task 5，測試用）
- Produces：
  - `SAVE_DEBOUNCE_MS = 500`
  - `type PersistenceBlock = 'unavailable' | 'newer-version' | 'backup-failed'`
  - `interface WorkspacePersistenceOptions { storage: Storage | null; blocked: PersistenceBlock | null; initialJson: string | null; getWorkspace: () => SerializedWorkspace }`（全部 readonly）
  - `useWorkspacePersistence(options): { scheduleSave: () => void; flush: () => SaveResult; saveError: 'quota' | null }`
  - 行為（spec §5.3）：`blocked === 'unavailable'` 時 `flush` 回傳 `{ ok: false, reason: 'unavailable' }`；其他 block 回傳 `reason: 'blocked'`；JSON 與上次成功讀寫的相同時不寫、回傳 `{ ok: true }`；寫入成功才更新上次的 JSON；第一次成功寫入後呼叫一次 `navigator.storage.persist()`；`pagehide`、`visibilitychange`（hidden）與 unmount 會立即寫入

**lint 注意：** effect 本體不可同步呼叫 setState；effect cleanup 不可直接讀 `timerRef.current`（`exhaustive-deps` 會警告），所以取消計時器包在 `cancelPendingSave` 裡。

- [ ] **Step 1: 先寫測試 `src/hooks/useWorkspacePersistence.test.ts`**

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SerializedWorkspace } from '../persistence/workspaceSerializer'
import { WORKSPACE_STORAGE_KEY, type SaveResult } from '../persistence/workspaceStorage'
import { createFakeStorage } from '../test/fakeStorage'
import {
  SAVE_DEBOUNCE_MS,
  useWorkspacePersistence,
  type WorkspacePersistenceOptions,
} from './useWorkspacePersistence'

const workspace = (name: string): SerializedWorkspace => ({
  version: 1,
  activeTabId: 'tab-1',
  tabs: [{ id: 'tab-1', name, nodes: [], edges: [], params: {} }],
})

describe('useWorkspacePersistence', () => {
  let current: SerializedWorkspace

  const render = (overrides: Partial<WorkspacePersistenceOptions> = {}) => {
    const storage = createFakeStorage()
    const options: WorkspacePersistenceOptions = {
      storage,
      blocked: null,
      initialJson: JSON.stringify(workspace('One')),
      getWorkspace: () => current,
      ...overrides,
    }
    const hook = renderHook((props: WorkspacePersistenceOptions) => useWorkspacePersistence(props), {
      initialProps: options,
    })
    return { hook, storage: options.storage ?? storage }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    current = workspace('One')
  })

  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(document, 'visibilityState')
    Reflect.deleteProperty(navigator, 'storage')
  })

  it('writes once for several changes within the debounce window', () => {
    const { hook, storage } = render()
    const setItem = vi.spyOn(storage, 'setItem')
    current = workspace('Two')

    act(() => {
      hook.result.current.scheduleSave()
      vi.advanceTimersByTime(100)
      hook.result.current.scheduleSave()
      vi.advanceTimersByTime(100)
      hook.result.current.scheduleSave()
    })
    expect(setItem).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    })

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace('Two')))
  })

  it('does not write when the workspace equals the last persisted JSON', () => {
    const { hook, storage } = render()
    const setItem = vi.spyOn(storage, 'setItem')

    act(() => {
      hook.result.current.scheduleSave()
      vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    })
    let result: SaveResult = { ok: false, reason: 'unavailable' }
    act(() => {
      result = hook.result.current.flush()
    })

    expect(result).toEqual({ ok: true })
    expect(setItem).not.toHaveBeenCalled()
  })

  it('writes immediately on pagehide and when the page becomes hidden', () => {
    const { storage } = render()
    const setItem = vi.spyOn(storage, 'setItem')

    current = workspace('Two')
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(setItem).toHaveBeenCalledTimes(1)

    current = workspace('Three')
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(setItem).toHaveBeenCalledTimes(2)
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace('Three')))
  })

  it('reports a full storage, retries, and clears the error after a successful write', () => {
    const { hook, storage } = render()
    vi.spyOn(storage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })
    current = workspace('Two')

    let result: SaveResult = { ok: true }
    act(() => {
      result = hook.result.current.flush()
    })
    expect(result).toEqual({ ok: false, reason: 'quota' })
    expect(hook.result.current.saveError).toBe('quota')

    act(() => {
      result = hook.result.current.flush()
    })

    expect(result).toEqual({ ok: true })
    expect(hook.result.current.saveError).toBeNull()
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace('Two')))
  })

  it('never writes while persistence is blocked', () => {
    const blocked = render({ blocked: 'newer-version' })
    const setItem = vi.spyOn(blocked.storage, 'setItem')
    current = workspace('Two')

    let result: SaveResult = { ok: true }
    act(() => {
      result = blocked.hook.result.current.flush()
    })
    expect(result).toEqual({ ok: false, reason: 'blocked' })
    expect(setItem).not.toHaveBeenCalled()
    expect(blocked.hook.result.current.saveError).toBeNull()

    const unavailable = render({ storage: null, blocked: 'unavailable' })
    act(() => {
      result = unavailable.hook.result.current.flush()
    })
    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('writes pending changes when it unmounts', () => {
    const { hook, storage } = render()
    current = workspace('Two')

    act(() => {
      hook.result.current.scheduleSave()
    })
    hook.unmount()

    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace('Two')))
  })

  it('asks the browser to keep the storage once, after the first successful write', () => {
    const persist = vi.fn(() => Promise.resolve(true))
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist } })
    const { hook } = render()

    current = workspace('Two')
    act(() => {
      hook.result.current.flush()
    })
    current = workspace('Three')
    act(() => {
      hook.result.current.flush()
    })

    expect(persist).toHaveBeenCalledTimes(1)
  })
})
```

Run: `npx vitest run src/hooks/useWorkspacePersistence.test.ts`
Expected: FAIL，找不到 `./useWorkspacePersistence`。

- [ ] **Step 2: 實作 `src/hooks/useWorkspacePersistence.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SerializedWorkspace } from '../persistence/workspaceSerializer'
import { saveWorkspace, type SaveResult } from '../persistence/workspaceStorage'

export const SAVE_DEBOUNCE_MS = 500

export type PersistenceBlock = 'unavailable' | 'newer-version' | 'backup-failed'

export interface WorkspacePersistenceOptions {
  readonly storage: Storage | null
  readonly blocked: PersistenceBlock | null
  readonly initialJson: string | null
  readonly getWorkspace: () => SerializedWorkspace
}

export interface WorkspacePersistence {
  readonly scheduleSave: () => void
  readonly flush: () => SaveResult
  readonly saveError: 'quota' | null
}

export function useWorkspacePersistence({
  storage,
  blocked,
  initialJson,
  getWorkspace,
}: WorkspacePersistenceOptions): WorkspacePersistence {
  const [saveError, setSaveError] = useState<'quota' | null>(null)
  const lastPersistedJsonRef = useRef(initialJson)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistRequestedRef = useRef(false)
  const getWorkspaceRef = useRef(getWorkspace)

  useEffect(() => {
    getWorkspaceRef.current = getWorkspace
  }, [getWorkspace])

  const cancelPendingSave = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const writeIfChanged = useCallback((): SaveResult => {
    if (blocked === 'unavailable') return { ok: false, reason: 'unavailable' }
    if (blocked !== null) return { ok: false, reason: 'blocked' }

    const json = JSON.stringify(getWorkspaceRef.current())
    if (json === lastPersistedJsonRef.current) return { ok: true }

    const result = saveWorkspace(storage, json)
    if (result.ok) {
      lastPersistedJsonRef.current = json
      if (!persistRequestedRef.current) {
        persistRequestedRef.current = true
        void navigator.storage?.persist?.()?.catch(() => false)
      }
    }
    return result
  }, [blocked, storage])

  const flush = useCallback((): SaveResult => {
    cancelPendingSave()
    const result = writeIfChanged()
    setSaveError(!result.ok && result.reason === 'quota' ? 'quota' : null)
    return result
  }, [cancelPendingSave, writeIfChanged])

  const scheduleSave = useCallback(() => {
    cancelPendingSave()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      flush()
    }, SAVE_DEBOUNCE_MS)
  }, [cancelPendingSave, flush])

  useEffect(() => {
    const onPageHide = () => {
      flush()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [flush])

  useEffect(
    () => () => {
      cancelPendingSave()
      writeIfChanged()
    },
    [cancelPendingSave, writeIfChanged],
  )

  return { scheduleSave, flush, saveError }
}
```

Run: `npx vitest run src/hooks/useWorkspacePersistence.test.ts`
Expected: `7 passed`，輸出沒有 `act(...)` 警告。

- [ ] **Step 3: 覆蓋率、型別與 lint**

```bash
npm test
npx vitest run --coverage --coverage.include=src/hooks/useWorkspacePersistence.ts
npm run build
npx eslint src/hooks/useWorkspacePersistence.ts src/hooks/useWorkspacePersistence.test.ts
```

Expected：`npm test` 36 passed；覆蓋率 ≥ 80% 且沒有 threshold 錯誤；build 成功；eslint 沒有輸出。

如果 eslint 回報 React Compiler 規則（例如 `react-hooks/refs`、`react-hooks/preserve-manual-memoization`），調整寫法讓規則通過，不可加 `eslint-disable`；調整後重跑 Step 2 的測試並在報告中說明。

- [ ] **Step 4: Commit**

```bash
git -C .. add frontend/src/hooks/useWorkspacePersistence.ts frontend/src/hooks/useWorkspacePersistence.test.ts
git -C .. commit -m "feat: add debounced workspace persistence hook"
```

---

### Task 7: 還原 workspace 並讓 `useCanvasTabs` 持久化

**Files:**
- Create: `frontend/src/persistence/initialWorkspace.ts`、`frontend/src/hooks/useCanvasTabs.test.ts`
- Modify: `frontend/src/hooks/useCanvasTabs.ts`（整個改寫）、`frontend/src/App.tsx:36-53`（暫時的呼叫方式，Task 8 會再改）

**Interfaces:**
- Consumes：`loadWorkspace`、`getBrowserStorage`、`WORKSPACE_STORAGE_KEY`、`CORRUPT_BACKUP_KEY`（Task 5）；`toPersistedWorkspace`、`CanvasSnapshot`（Task 4）；`useWorkspacePersistence`、`PersistenceBlock`（Task 6）；`seedNodeIdCounter`、`generateNodeId`（Task 3）
- Produces（`initialWorkspace.ts`）：
  - `interface CanvasTab { id; name; nodes: readonly Node[]; edges: readonly Edge[]; params: SystemParams }`（全部 readonly；`useCanvasTabs.ts` 以 `export type { CanvasTab }` 轉出，`TabBar.tsx` 的 import 不用改）
  - `createEmptyTab(name: string): CanvasTab`
  - `interface InitialWorkspace { storage: Storage | null; tabs: readonly CanvasTab[]; activeTabId: string; blocked: PersistenceBlock | null; restoreFailed: boolean; initialJson: string }`
  - `createInitialWorkspace(storage: Storage | null): InitialWorkspace`
- Produces（`useCanvasTabs()` 回傳值）：`tabs`、`activeTab`、`activeTabId`、`addTab()`、`switchTab(tabId)`、`closeTab(tabId)`、`renameTab(tabId, name)`、`updateCanvasStateRef(tabId: string, nodes: Node[], edges: Edge[], params: SystemParams)`、`flush(): SaveResult`、`saveError: 'quota' | null`、`persistenceBlocked: PersistenceBlock | null`、`restoreFailed: boolean`
  - 舊的 `getCurrentState` 移除（沒有任何呼叫者，Step 1 會確認）

- [ ] **Step 1: 確認 `getCurrentState` 沒有被使用**

Run: `grep -rn "getCurrentState" src`
Expected：只出現在 `src/hooks/useCanvasTabs.ts`。如果其他檔案有使用，停下來回報 NEEDS_CONTEXT。

- [ ] **Step 2: 先寫測試 `src/hooks/useCanvasTabs.test.ts`**

```ts
import type { Node } from '@xyflow/react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toPersistedWorkspace } from '../persistence/workspaceSerializer'
import { CORRUPT_BACKUP_KEY, WORKSPACE_STORAGE_KEY } from '../persistence/workspaceStorage'
import { generateNodeId } from '../utils/nodeId'
import { SAVE_DEBOUNCE_MS } from './useWorkspacePersistence'
import { useCanvasTabs } from './useCanvasTabs'

const node = (id: string): Node => ({ id, position: { x: 0, y: 0 }, data: { label: id } })

const storedWorkspace = (nodeId: string) =>
  JSON.stringify(
    toPersistedWorkspace(
      [
        { id: 'tab-a', name: 'Checkout', nodes: [node(nodeId)], edges: [], params: { dau: 7 } },
        { id: 'tab-b', name: 'Search', nodes: [], edges: [], params: {} },
      ],
      'tab-b',
      null,
    ),
  )

const readStored = () => JSON.parse(window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? 'null')

describe('useCanvasTabs', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
  })

  it('starts with one empty Untitled 1 tab when nothing is stored', () => {
    const { result } = renderHook(() => useCanvasTabs())

    expect(result.current.tabs.map((tab) => tab.name)).toEqual(['Untitled 1'])
    expect(result.current.activeTab.id).toBe(result.current.activeTabId)
    expect(result.current.restoreFailed).toBe(false)
    expect(result.current.persistenceBlocked).toBeNull()
  })

  it('restores stored tabs, params and the active tab', () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, storedWorkspace('node-3'))

    const { result } = renderHook(() => useCanvasTabs())

    expect(result.current.tabs.map((tab) => tab.name)).toEqual(['Checkout', 'Search'])
    expect(result.current.activeTabId).toBe('tab-b')
    expect(result.current.tabs[0].params).toEqual({ dau: 7 })
    expect(result.current.tabs[0].nodes.map((item) => item.id)).toEqual(['node-3'])
  })

  it('moves the node id counter past restored node ids', () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, storedWorkspace('node-50'))

    renderHook(() => useCanvasTabs())

    expect(generateNodeId()).toBe('node-51')
  })

  it('saves tab changes after the debounce delay', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCanvasTabs())

    act(() => {
      result.current.addTab()
    })
    act(() => {
      result.current.renameTab(result.current.activeTabId, 'Payments')
    })
    act(() => {
      vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    })

    expect(readStored().tabs.map((tab: { name: string }) => tab.name)).toEqual(['Untitled 1', 'Payments'])
  })

  it('keeps the canvas snapshot, including params, when switching tabs', () => {
    const { result } = renderHook(() => useCanvasTabs())
    const firstTabId = result.current.activeTabId

    act(() => {
      result.current.updateCanvasStateRef(firstTabId, [node('node-1')], [], { dau: 5 })
    })
    act(() => {
      result.current.addTab()
    })
    act(() => {
      result.current.switchTab(firstTabId)
    })

    expect(result.current.activeTab.params).toEqual({ dau: 5 })
    expect(result.current.activeTab.nodes.map((item) => item.id)).toEqual(['node-1'])
  })

  it('ignores a snapshot reported for a tab that is no longer active', () => {
    const { result } = renderHook(() => useCanvasTabs())
    const firstTabId = result.current.activeTabId

    act(() => {
      result.current.updateCanvasStateRef(firstTabId, [node('node-1')], [], {})
    })
    act(() => {
      result.current.addTab()
    })
    act(() => {
      result.current.updateCanvasStateRef(firstTabId, [node('node-9')], [], {})
    })
    act(() => {
      result.current.switchTab(firstTabId)
    })

    expect(result.current.activeTab.nodes.map((item) => item.id)).toEqual(['node-1'])
  })

  it('activates the neighbouring tab when the active tab is closed', () => {
    const { result } = renderHook(() => useCanvasTabs())
    act(() => {
      result.current.addTab()
    })
    const secondTabId = result.current.activeTabId
    act(() => {
      result.current.addTab()
    })
    const thirdTabId = result.current.activeTabId
    act(() => {
      result.current.switchTab(secondTabId)
    })

    act(() => {
      result.current.closeTab(secondTabId)
    })

    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.activeTabId).toBe(thirdTabId)
  })

  it('flushes the current canvas snapshot immediately', () => {
    const { result } = renderHook(() => useCanvasTabs())

    act(() => {
      result.current.updateCanvasStateRef(result.current.activeTabId, [node('node-4')], [], { avgQPS: 3 })
    })
    act(() => {
      result.current.flush()
    })

    expect(readStored().tabs[0].nodes.map((item: { id: string }) => item.id)).toEqual(['node-4'])
    expect(readStored().tabs[0].params).toEqual({ avgQPS: 3 })
  })

  it('reports restore problems', () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, '{not json')
    const corrupt = renderHook(() => useCanvasTabs())
    expect(corrupt.result.current.restoreFailed).toBe(true)
    expect(corrupt.result.current.persistenceBlocked).toBeNull()
    expect(window.localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe('{not json')

    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ ...JSON.parse(storedWorkspace('node-1')), version: 2 }))
    const newer = renderHook(() => useCanvasTabs())
    expect(newer.result.current.persistenceBlocked).toBe('newer-version')

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Access is denied.', 'SecurityError')
    })
    const unavailable = renderHook(() => useCanvasTabs())
    expect(unavailable.result.current.persistenceBlocked).toBe('unavailable')
  })

  it('blocks saving when a corrupt workspace cannot be backed up', () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, '{not json')
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === CORRUPT_BACKUP_KEY) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      originalSetItem.call(this, key, value)
    })

    const { result } = renderHook(() => useCanvasTabs())
    act(() => {
      result.current.flush()
    })

    expect(result.current.persistenceBlocked).toBe('backup-failed')
    expect(result.current.restoreFailed).toBe(false)
    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe('{not json')
  })
})
```

Run: `npx vitest run src/hooks/useCanvasTabs.test.ts`
Expected: FAIL（`updateCanvasStateRef` 簽名不同、沒有 `flush` / `persistenceBlocked` / `restoreFailed`、沒有還原）。

- [ ] **Step 3: 實作 `src/persistence/initialWorkspace.ts`**

```ts
import type { Edge, Node } from '@xyflow/react'
import type { PersistenceBlock } from '../hooks/useWorkspacePersistence'
import type { SystemParams } from '../types/topology'
import { seedNodeIdCounter } from '../utils/nodeId'
import type { PersistedTab } from './workspaceSchema'
import { toPersistedWorkspace } from './workspaceSerializer'
import { loadWorkspace } from './workspaceStorage'

export interface CanvasTab {
  readonly id: string
  readonly name: string
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  readonly params: SystemParams
}

export interface InitialWorkspace {
  readonly storage: Storage | null
  readonly tabs: readonly CanvasTab[]
  readonly activeTabId: string
  readonly blocked: PersistenceBlock | null
  readonly restoreFailed: boolean
  readonly initialJson: string
}

let tabCounter = 0

function generateTabId(): string {
  tabCounter += 1
  return `tab-${Date.now()}-${tabCounter}`
}

export function createEmptyTab(name: string): CanvasTab {
  return { id: generateTabId(), name, nodes: [], edges: [], params: {} }
}

function toCanvasTab(tab: PersistedTab): CanvasTab {
  // workspaceSchema validated id, position and data; React Flow takes the other stored fields as they are.
  return {
    id: tab.id,
    name: tab.name,
    nodes: tab.nodes as unknown as Node[],
    edges: tab.edges as unknown as Edge[],
    params: tab.params,
  }
}

function withInitialJson(workspace: Omit<InitialWorkspace, 'initialJson'>): InitialWorkspace {
  const serialized = toPersistedWorkspace(workspace.tabs, workspace.activeTabId, null)
  return { ...workspace, initialJson: JSON.stringify(serialized) }
}

function blankWorkspace(
  storage: Storage | null,
  blocked: PersistenceBlock | null,
  restoreFailed: boolean,
): InitialWorkspace {
  const tab = createEmptyTab('Untitled 1')
  return withInitialJson({ storage, tabs: [tab], activeTabId: tab.id, blocked, restoreFailed })
}

export function createInitialWorkspace(storage: Storage | null): InitialWorkspace {
  const result = loadWorkspace(storage)
  switch (result.status) {
    case 'loaded': {
      const tabs = result.workspace.tabs.map(toCanvasTab)
      seedNodeIdCounter(tabs.flatMap((tab) => tab.nodes.map((item) => item.id)))
      return withInitialJson({
        storage,
        tabs,
        activeTabId: result.workspace.activeTabId,
        blocked: null,
        restoreFailed: false,
      })
    }
    case 'empty':
      return blankWorkspace(storage, null, false)
    case 'corrupt':
      return blankWorkspace(storage, result.backedUp ? null : 'backup-failed', result.backedUp)
    case 'unsupported-version':
      return blankWorkspace(storage, 'newer-version', false)
    case 'unavailable':
      return blankWorkspace(null, 'unavailable', false)
  }
}
```

- [ ] **Step 4: 改寫 `src/hooks/useCanvasTabs.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { SystemParams } from '../types/topology'
import { createEmptyTab, createInitialWorkspace, type CanvasTab } from '../persistence/initialWorkspace'
import { toPersistedWorkspace, type CanvasSnapshot } from '../persistence/workspaceSerializer'
import { getBrowserStorage } from '../persistence/workspaceStorage'
import { useWorkspacePersistence } from './useWorkspacePersistence'

export type { CanvasTab } from '../persistence/initialWorkspace'

function nextActiveTabId(tabs: readonly CanvasTab[], closedTabId: string, activeTabId: string): string {
  if (closedTabId !== activeTabId) return activeTabId
  const closedIndex = tabs.findIndex((tab) => tab.id === closedTabId)
  const remaining = tabs.filter((tab) => tab.id !== closedTabId)
  return remaining[Math.min(closedIndex, remaining.length - 1)].id
}

export function useCanvasTabs() {
  const [initial] = useState(() => createInitialWorkspace(getBrowserStorage()))
  const [tabs, setTabs] = useState<readonly CanvasTab[]>(initial.tabs)
  const [activeTabId, setActiveTabId] = useState(initial.activeTabId)
  const snapshotRef = useRef<CanvasSnapshot | null>(null)
  const tabsRef = useRef(tabs)
  const activeTabIdRef = useRef(activeTabId)

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]

  useEffect(() => {
    tabsRef.current = tabs
    activeTabIdRef.current = activeTabId
  }, [tabs, activeTabId])

  const getWorkspace = useCallback(
    () => toPersistedWorkspace(tabsRef.current, activeTabIdRef.current, snapshotRef.current),
    [],
  )

  const { scheduleSave, flush, saveError } = useWorkspacePersistence({
    storage: initial.storage,
    blocked: initial.blocked,
    initialJson: initial.initialJson,
    getWorkspace,
  })

  useEffect(() => {
    scheduleSave()
  }, [tabs, activeTabId, scheduleSave])

  const saveCurrentCanvasState = useCallback(() => {
    const snapshot = snapshotRef.current
    if (!snapshot || snapshot.tabId !== activeTabId) return
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === snapshot.tabId
          ? { ...tab, nodes: [...snapshot.nodes], edges: [...snapshot.edges], params: { ...snapshot.params } }
          : tab,
      ),
    )
  }, [activeTabId])

  const addTab = useCallback(() => {
    saveCurrentCanvasState()
    const newTab = createEmptyTab(`Untitled ${tabs.length + 1}`)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [saveCurrentCanvasState, tabs.length])

  const switchTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTabId) return
      saveCurrentCanvasState()
      setActiveTabId(tabId)
    },
    [activeTabId, saveCurrentCanvasState],
  )

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return
      setActiveTabId(nextActiveTabId(tabs, tabId, activeTabId))
      setTabs(tabs.filter((tab) => tab.id !== tabId))
    },
    [tabs, activeTabId],
  )

  const renameTab = useCallback((tabId: string, newName: string) => {
    setTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, name: newName } : tab)))
  }, [])

  const updateCanvasStateRef = useCallback(
    (tabId: string, nodes: Node[], edges: Edge[], params: SystemParams) => {
      snapshotRef.current = { tabId, nodes, edges, params }
      scheduleSave()
    },
    [scheduleSave],
  )

  return {
    tabs,
    activeTab,
    activeTabId,
    addTab,
    switchTab,
    closeTab,
    renameTab,
    updateCanvasStateRef,
    flush,
    saveError,
    persistenceBlocked: initial.blocked,
    restoreFailed: initial.restoreFailed,
  }
}
```

- [ ] **Step 5: 讓 `App.tsx` 用新簽名呼叫（暫時，Task 8 會改成回報 Canvas 的 params）**

把 `App.tsx` 裡的：

```tsx
  const handleCanvasStateChange = useCallback(
    (nodes: import('@xyflow/react').Node[], edges: import('@xyflow/react').Edge[]) => {
      updateCanvasStateRef(nodes, edges)
    },
    [updateCanvasStateRef]
  )
```

換成：

```tsx
  const handleCanvasStateChange = useCallback(
    (nodes: import('@xyflow/react').Node[], edges: import('@xyflow/react').Edge[]) => {
      updateCanvasStateRef(activeTabId, nodes, edges, activeTab.params)
    },
    [updateCanvasStateRef, activeTabId, activeTab.params]
  )
```

- [ ] **Step 6: 確認測試通過**

Run: `npx vitest run src/hooks/useCanvasTabs.test.ts`
Expected: `10 passed`，沒有 `act(...)` 警告。

- [ ] **Step 7: 完整單元測試、覆蓋率、型別、lint 與回歸測試**

```bash
npm test
npm run test:coverage
npm run build
npx eslint src/persistence src/hooks src/App.tsx
npm run lint 2>&1 | tail -1
npx playwright test --reporter=line --global-timeout=900000
```

Expected：
- `npm test`：46 passed。
- `npm run test:coverage`：所有列入門檻的檔案 ≥ 80%（此時尚未建立的檔案不列入），沒有 threshold 錯誤。
- build 成功；eslint 沒有輸出；`npm run lint` 最後一行 `✖ 9 problems (2 errors, 7 warnings)`。
- Playwright：`136 passed`、`1 skipped`（行為還沒有使用者看得到的變化，回歸測試全部維持）。

- [ ] **Step 8: Commit**

```bash
git -C .. add frontend/src/persistence/initialWorkspace.ts frontend/src/hooks/useCanvasTabs.ts frontend/src/hooks/useCanvasTabs.test.ts frontend/src/App.tsx
git -C .. commit -m "feat: restore and persist canvas tabs"
```

---

### Task 8: Canvas 回報 params 與 undo/redo 結果

**Files:**
- Create: `frontend/e2e/persistence.spec.ts`
- Modify: `frontend/src/components/Canvas.tsx`（`CanvasProps`、函式參數、`systemParams` 初始值、history effect）、`frontend/src/App.tsx`、`frontend/e2e/support/app.ts`（新增 helper）

**Interfaces:**
- Consumes：`useCanvasTabs().updateCanvasStateRef(tabId, nodes, edges, params)`、`activeTab.params`（Task 7）；`mockAnalysis`、`openApp`、`loadPreset`、`dropComponent`、`nodeById`、`canvasNodes`、`canvasEdges`、`nodeIds`（PR 1）
- Produces：
  - `Canvas` props：`initialParams?: SystemParams`；`onStateChange?: (nodes: Node[], edges: Edge[], params: SystemParams) => void`（在獨立的 effect 裡回報，undo/redo 也會回報）
  - `e2e/support/app.ts`：`SHORTCUT_REBIND_MS = 500`、`WORKSPACE_STORAGE_KEY`、`type StoredWorkspace`、`readStoredWorkspace(page): Promise<StoredWorkspace | null>`、`storedNodeCounts(page): Promise<readonly number[]>`、`setDau(page, value: string)`、`readDau(page): Promise<string>`

- [ ] **Step 1: 在 `e2e/support/app.ts` 加上 helper**

在 `export const BACKEND_ERROR_SOLUTION = ...` 下面加上：

```ts
// The app's keyboard shortcuts read state through a window keydown listener that React re-binds after
// re-rendering, so a shortcut pressed right after a state change can read stale state.
export const SHORTCUT_REBIND_MS = 500

export const WORKSPACE_STORAGE_KEY = 'architectmind:workspace'

export interface StoredWorkspace {
  readonly version: number
  readonly activeTabId: string
  readonly tabs: readonly {
    readonly id: string
    readonly name: string
    readonly nodes: readonly { readonly id: string }[]
    readonly edges: readonly { readonly id: string }[]
    readonly params: Readonly<Record<string, unknown>>
  }[]
}
```

在檔案最後加上：

```ts
export async function readStoredWorkspace(page: Page): Promise<StoredWorkspace | null> {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)
  return raw === null ? null : (JSON.parse(raw) as StoredWorkspace)
}

export async function storedNodeCounts(page: Page): Promise<readonly number[]> {
  const workspace = await readStoredWorkspace(page)
  return workspace ? workspace.tabs.map((tab) => tab.nodes.length) : []
}

export async function setDau(page: Page, value: string): Promise<void> {
  await page.getByRole('button', { name: 'Params' }).click()
  await page.getByPlaceholder('e.g., 1000000').fill(value)
  await page.getByRole('button', { name: '✕' }).click()
}

export async function readDau(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Params' }).click()
  const value = await page.getByPlaceholder('e.g., 1000000').inputValue()
  await page.getByRole('button', { name: '✕' }).click()
  return value
}
```

- [ ] **Step 2: 先寫 E2E `e2e/persistence.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import {
  SHORTCUT_REBIND_MS,
  canvasEdges,
  canvasNodes,
  dropComponent,
  loadPreset,
  mockAnalysis,
  nodeById,
  nodeIds,
  openApp,
  readDau,
  setDau,
  storedNodeCounts,
} from './support/app'

async function deleteAndUndoLogger(page: Page): Promise<void> {
  await nodeById(page, 'demo-logger').click()
  await page.keyboard.press('Backspace')
  await expect(canvasNodes(page)).toHaveCount(13)
  await page.waitForTimeout(SHORTCUT_REBIND_MS)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvasNodes(page)).toHaveCount(14)
}

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
})

test('restores tabs, canvas content, params and the active tab after a reload', async ({ page }) => {
  await loadPreset(page, 'Basic')
  await setDau(page, '1000000')
  await page.getByTitle('New canvas').click()
  await dropComponent(page, 'client', 300, 200)
  await expect(canvasNodes(page)).toHaveCount(1)
  await page.getByText('Untitled 1', { exact: true }).click()
  await expect(canvasNodes(page)).toHaveCount(14)
  await expect.poll(() => storedNodeCounts(page)).toEqual([14, 1])

  await page.reload()

  await expect(page.getByText('Untitled 2', { exact: true })).toBeVisible()
  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(canvasEdges(page)).toHaveCount(13)
  expect(await readDau(page)).toBe('1000000')
  await page.getByText('Untitled 2', { exact: true }).click()
  await expect(canvasNodes(page)).toHaveCount(1)
})

test('keeps new node ids unique after a reload', async ({ page }) => {
  await dropComponent(page, 'service', 300, 150)
  await dropComponent(page, 'database', 300, 450)
  await expect(canvasNodes(page)).toHaveCount(2)
  await expect.poll(() => storedNodeCounts(page)).toEqual([2])

  await page.reload()
  await expect(canvasNodes(page)).toHaveCount(2)
  await dropComponent(page, 'cache', 650, 450)

  await expect(canvasNodes(page)).toHaveCount(3)
  const ids = await nodeIds(page)
  expect(new Set(ids).size).toBe(3)
  expect(ids).toContain('node-3')
})

test('keeps system parameters when switching tabs', async ({ page }) => {
  await setDau(page, '5000')

  await page.getByTitle('New canvas').click()
  await page.getByText('Untitled 1', { exact: true }).click()

  await expect(page.getByRole('button', { name: 'Params' }).locator('span')).toHaveCount(1)
  expect(await readDau(page)).toBe('5000')
})

test('keeps the undo result after a reload', async ({ page }) => {
  await loadPreset(page, 'Basic')
  await deleteAndUndoLogger(page)
  await expect.poll(() => storedNodeCounts(page)).toEqual([14])

  await page.reload()

  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(nodeById(page, 'demo-logger')).toHaveCount(1)
})

test('keeps the undo result after switching tabs', async ({ page }) => {
  await loadPreset(page, 'Basic')
  await deleteAndUndoLogger(page)

  await page.getByTitle('New canvas').click()
  await page.getByText('Untitled 1', { exact: true }).click()

  await expect(canvasNodes(page)).toHaveCount(14)
  await expect(nodeById(page, 'demo-logger')).toHaveCount(1)
})

test('only a window with changes writes the workspace', async ({ page, context }) => {
  const other = await context.newPage()
  await openApp(other)
  await dropComponent(other, 'service', 300, 200)
  await expect.poll(() => storedNodeCounts(other)).toEqual([1])

  await other.goto('about:blank')
  await page.goto('about:blank')

  const reader = await context.newPage()
  await openApp(reader)
  await expect(canvasNodes(reader)).toHaveCount(1)
})
```

- [ ] **Step 3: 確認 params 與 undo 相關的測試先失敗**

Run: `npx playwright test e2e/persistence.spec.ts --reporter=line --global-timeout=900000`
Expected：`12 failed`、`6 passed`。每個 project 失敗的是 `restores tabs…`、`keeps system parameters…`、`keeps the undo result after a reload`、`keeps the undo result after switching tabs`；`keeps new node ids unique…` 與 `only a window with changes…` 已經因 Task 6、7 通過。實際結果不同時，記錄到報告再繼續，不要改測試。

- [ ] **Step 4: 修改 `Canvas.tsx`**

`CanvasProps` 改成：

```ts
interface CanvasProps {
  theme: 'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk';
  setTheme: (theme: 'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk') => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  initialParams?: SystemParams;
  onStateChange?: (nodes: Node[], edges: Edge[], params: SystemParams) => void;
}
```

函式宣告改成：

```ts
function Canvas({ theme, setTheme, initialNodes = [], initialEdges = [], initialParams, onStateChange }: CanvasProps) {
```

`systemParams` 的 state 改成：

```ts
  const [systemParams, setSystemParams] = useState<SystemParams>(() => initialParams ?? {})
```

history effect 的結尾，把：

```ts
    prevNodesRef.current = [...nodes]
    prevEdgesRef.current = [...edges]

    if (onStateChange) {
      onStateChange(nodes, edges)
    }
  }, [nodes, edges, onStateChange])
```

換成：

```ts
    prevNodesRef.current = [...nodes]
    prevEdgesRef.current = [...edges]
  }, [nodes, edges])

  // Reported outside the history effect, which returns early during undo/redo.
  useEffect(() => {
    onStateChange?.(nodes, edges, systemParams)
  }, [nodes, edges, systemParams, onStateChange])
```

`Canvas.tsx` 其他地方不變。

- [ ] **Step 5: 修改 `App.tsx`**

檔案開頭的 import 改成：

```tsx
import { useState, useEffect, useCallback } from 'react'
import type { Edge, Node } from '@xyflow/react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import TabBar from './components/TabBar'
import { useCanvasTabs } from './hooks/useCanvasTabs'
import type { SystemParams } from './types/topology'
```

Task 7 暫時的 `handleCanvasStateChange` 換成：

```tsx
  const handleCanvasStateChange = useCallback(
    (nodes: Node[], edges: Edge[], params: SystemParams) => {
      updateCanvasStateRef(activeTabId, nodes, edges, params)
    },
    [updateCanvasStateRef, activeTabId]
  )
```

`<Canvas>` 加上 `initialParams`：

```tsx
        <Canvas
          key={activeTabId}
          theme={theme}
          setTheme={setTheme}
          initialNodes={[...activeTab.nodes]}
          initialEdges={[...activeTab.edges]}
          initialParams={activeTab.params}
          onStateChange={handleCanvasStateChange}
        />
```

- [ ] **Step 6: 確認新測試通過**

Run: `npx playwright test e2e/persistence.spec.ts --reporter=line --global-timeout=900000`
Expected: `18 passed`

- [ ] **Step 7: 型別、lint、單元測試與回歸測試**

```bash
npm run build
npx eslint e2e src/App.tsx
npm run lint 2>&1 | tail -1
npm test
npx playwright test --reporter=line --global-timeout=900000
npx playwright test e2e/persistence.spec.ts e2e/editing.spec.ts --reporter=line --global-timeout=1800000 --repeat-each=3
```

Expected：
- build 成功；eslint 沒有輸出；`npm run lint` 最後一行 `✖ 9 problems (2 errors, 7 warnings)`（`Canvas.tsx` 的 warning 數量不可增加）。
- `npm test`：46 passed。
- 完整 e2e：`154 passed`、`1 skipped`。
- 重複跑：`126 passed`（(6 + 8) × 3 個 project × 3），0 flaky。

- [ ] **Step 8: Commit**

```bash
git -C .. add frontend/src/components/Canvas.tsx frontend/src/App.tsx frontend/e2e/support/app.ts frontend/e2e/persistence.spec.ts
git -C .. commit -m "feat: persist system params and undo results per tab"
```

---

### Task 9: 主題的安全讀寫、theme-color 與儲存提示

**Files:**
- Create: `frontend/src/theme/themePreference.ts`、`frontend/src/theme/themePreference.test.ts`、`frontend/src/theme/themeColor.ts`、`frontend/src/notices/selectNotice.ts`、`frontend/src/notices/selectNotice.test.ts`、`frontend/src/components/Toast.tsx`、`frontend/src/components/Toast.test.tsx`、`frontend/src/components/PersistenceNotice.tsx`、`frontend/src/components/PersistenceNotice.test.tsx`、`frontend/e2e/storage-notices.spec.ts`、`frontend/e2e/theme-color.spec.ts`
- Modify: `frontend/src/App.tsx`（整個改寫）

**Interfaces:**
- Consumes：`getBrowserStorage`（Task 5）；`useCanvasTabs()` 的 `saveError`、`persistenceBlocked`、`restoreFailed`（Task 7）；`PersistenceBlock`（Task 6）；e2e helper `WORKSPACE_STORAGE_KEY`、`readStoredWorkspace`（Task 8）
- Produces：
  - `type Theme = 'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk'`、`THEME_STORAGE_KEY = 'theme'`
  - `readThemePreference(storage: Storage | null, prefersDark: boolean): Theme`、`writeThemePreference(storage: Storage | null, theme: Theme): void`
  - `syncThemeColor(): void` — 把 `<meta name="theme-color">` 設成目前 `<html>` 的 `--bg-primary`
  - `type NoticeKind = PersistenceBlock | 'quota' | 'restore-failed'`、`interface NoticeState { persistenceBlocked; saveError; restoreFailed }`、`selectNotice(state): NoticeKind | null`、`NOTICE_MESSAGES: Readonly<Record<NoticeKind, string>>`
  - `<Toast message actions />`、`interface ToastAction { label: string; onClick: () => void }`
  - `<PersistenceNotice persistenceBlocked saveError restoreFailed onReload />`
  - Task 11 的 `PwaUpdatePrompt` 會把 `PersistenceNotice` 當成 fallback 包起來（spec §7 的優先順序：更新提示 > 持久化停用 > 容量已滿 > 還原失敗）

- [ ] **Step 1: 先寫主題偏好的測試 `src/theme/themePreference.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createFakeStorage } from '../test/fakeStorage'
import { THEME_STORAGE_KEY, readThemePreference, writeThemePreference } from './themePreference'

const blocked = () => new DOMException('Access is denied.', 'SecurityError')

describe('readThemePreference', () => {
  it('returns the saved theme', () => {
    expect(readThemePreference(createFakeStorage({ [THEME_STORAGE_KEY]: 'dream' }), false)).toBe('dream')
  })

  it('falls back to the system preference when nothing valid is saved', () => {
    expect(readThemePreference(createFakeStorage(), true)).toBe('dark')
    expect(readThemePreference(createFakeStorage({ [THEME_STORAGE_KEY]: 'neon' }), false)).toBe('light')
  })

  it('falls back without throwing when storage is missing or failing', () => {
    expect(readThemePreference(null, true)).toBe('dark')
    expect(readThemePreference(createFakeStorage({}, { getError: blocked() }), false)).toBe('light')
  })
})

describe('writeThemePreference', () => {
  it('stores the theme and never throws', () => {
    const storage = createFakeStorage()

    writeThemePreference(storage, 'warm')

    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('warm')
    expect(() => writeThemePreference(null, 'dark')).not.toThrow()
    expect(() => writeThemePreference(createFakeStorage({}, { setError: blocked() }), 'dark')).not.toThrow()
  })
})
```

Run: `npx vitest run src/theme/themePreference.test.ts`
Expected: FAIL，找不到 `./themePreference`。

- [ ] **Step 2: 實作 `src/theme/themePreference.ts` 與 `src/theme/themeColor.ts`**

`src/theme/themePreference.ts`：

```ts
export type Theme = 'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk'

export const THEME_STORAGE_KEY = 'theme'

const THEMES: readonly string[] = ['light', 'dark', 'warm', 'dream', 'cyberpunk']

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && THEMES.includes(value)
}

export function readThemePreference(storage: Storage | null, prefersDark: boolean): Theme {
  const fallback: Theme = prefersDark ? 'dark' : 'light'
  if (!storage) return fallback
  try {
    const saved = storage.getItem(THEME_STORAGE_KEY)
    return isTheme(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

export function writeThemePreference(storage: Storage | null, theme: Theme): void {
  if (!storage) return
  try {
    storage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The theme still applies for this session when the browser refuses to store it.
  }
}
```

`src/theme/themeColor.ts`：

```ts
const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]'

export function syncThemeColor(): void {
  const meta = document.querySelector(THEME_COLOR_SELECTOR)
  const background = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
  if (meta && background) meta.setAttribute('content', background)
}
```

Run: `npx vitest run src/theme/themePreference.test.ts`
Expected: `4 passed`

- [ ] **Step 3: 先寫提示選擇的測試 `src/notices/selectNotice.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { NOTICE_MESSAGES, selectNotice } from './selectNotice'

describe('selectNotice', () => {
  it('returns nothing when persistence is healthy', () => {
    expect(selectNotice({ persistenceBlocked: null, saveError: null, restoreFailed: false })).toBeNull()
  })

  it('prefers a blocked persistence over a full storage over a failed restore', () => {
    expect(selectNotice({ persistenceBlocked: 'newer-version', saveError: 'quota', restoreFailed: true })).toBe(
      'newer-version',
    )
    expect(selectNotice({ persistenceBlocked: null, saveError: 'quota', restoreFailed: true })).toBe('quota')
    expect(selectNotice({ persistenceBlocked: null, saveError: null, restoreFailed: true })).toBe('restore-failed')
  })

  it('uses the exact copy from the spec', () => {
    expect(NOTICE_MESSAGES).toEqual({
      'newer-version':
        "This workspace was saved by a newer version of ArchitectMind. Reload to update — changes in this window won't be saved.",
      'backup-failed':
        "Your saved workspace couldn't be restored or backed up. To protect it, changes in this window won't be saved.",
      unavailable: "This browser is blocking local storage — changes won't be kept after you close the app.",
      quota: "Storage is full — recent changes couldn't be saved.",
      'restore-failed': "Your saved workspace couldn't be restored. A backup was kept in this browser.",
    })
  })
})
```

Run: `npx vitest run src/notices/selectNotice.test.ts`
Expected: FAIL，找不到 `./selectNotice`。

- [ ] **Step 4: 實作 `src/notices/selectNotice.ts`**

```ts
import type { PersistenceBlock } from '../hooks/useWorkspacePersistence'

export type NoticeKind = PersistenceBlock | 'quota' | 'restore-failed'

export interface NoticeState {
  readonly persistenceBlocked: PersistenceBlock | null
  readonly saveError: 'quota' | null
  readonly restoreFailed: boolean
}

export function selectNotice({ persistenceBlocked, saveError, restoreFailed }: NoticeState): NoticeKind | null {
  if (persistenceBlocked !== null) return persistenceBlocked
  if (saveError !== null) return saveError
  return restoreFailed ? 'restore-failed' : null
}

export const NOTICE_MESSAGES: Readonly<Record<NoticeKind, string>> = {
  'newer-version':
    "This workspace was saved by a newer version of ArchitectMind. Reload to update — changes in this window won't be saved.",
  'backup-failed':
    "Your saved workspace couldn't be restored or backed up. To protect it, changes in this window won't be saved.",
  unavailable: "This browser is blocking local storage — changes won't be kept after you close the app.",
  quota: "Storage is full — recent changes couldn't be saved.",
  'restore-failed': "Your saved workspace couldn't be restored. A backup was kept in this browser.",
}
```

Run: `npx vitest run src/notices/selectNotice.test.ts`
Expected: `3 passed`

- [ ] **Step 5: 先寫 `src/components/Toast.test.tsx`，再實作 `Toast.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Toast from './Toast'

describe('Toast', () => {
  it('shows the message and runs an action when its button is clicked', () => {
    const onReload = vi.fn()
    render(<Toast message="Storage is full." actions={[{ label: 'Reload', onClick: onReload }]} />)

    expect(screen.getByRole('status').textContent).toContain('Storage is full.')
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('renders no buttons without actions', () => {
    render(<Toast message="Saved." actions={[]} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
```

Run: `npx vitest run src/components/Toast.test.tsx`
Expected: FAIL，找不到 `./Toast`。

`src/components/Toast.tsx`：

```tsx
export interface ToastAction {
  readonly label: string
  readonly onClick: () => void
}

interface ToastProps {
  readonly message: string
  readonly actions: readonly ToastAction[]
}

export default function Toast({ message, actions }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 2000,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 8,
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: 13,
        lineHeight: 1.45,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <span>{message}</span>
      {actions.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

Run: `npx vitest run src/components/Toast.test.tsx`
Expected: `2 passed`

- [ ] **Step 6: 先寫 `src/components/PersistenceNotice.test.tsx`，再實作 `PersistenceNotice.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NOTICE_MESSAGES } from '../notices/selectNotice'
import PersistenceNotice from './PersistenceNotice'

const healthy = { persistenceBlocked: null, saveError: null, restoreFailed: false } as const

describe('PersistenceNotice', () => {
  it('renders nothing while persistence is healthy', () => {
    const { container } = render(<PersistenceNotice {...healthy} onReload={vi.fn()} />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the selected notice without a reload button until it is dismissed', () => {
    render(<PersistenceNotice {...healthy} saveError="quota" onReload={vi.fn()} />)
    expect(screen.getByText(NOTICE_MESSAGES.quota)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText(NOTICE_MESSAGES.quota)).toBeNull()
  })

  it('offers a reload for a workspace saved by a newer version', () => {
    const onReload = vi.fn()
    render(<PersistenceNotice {...healthy} persistenceBlocked="newer-version" onReload={onReload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('shows a different notice after one was dismissed', () => {
    const { rerender } = render(<PersistenceNotice {...healthy} restoreFailed onReload={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    rerender(<PersistenceNotice {...healthy} restoreFailed saveError="quota" onReload={vi.fn()} />)

    expect(screen.getByText(NOTICE_MESSAGES.quota)).toBeTruthy()
  })
})
```

Run: `npx vitest run src/components/PersistenceNotice.test.tsx`
Expected: FAIL，找不到 `./PersistenceNotice`。

`src/components/PersistenceNotice.tsx`：

```tsx
import { useState } from 'react'
import { NOTICE_MESSAGES, selectNotice, type NoticeKind, type NoticeState } from '../notices/selectNotice'
import Toast, { type ToastAction } from './Toast'

interface PersistenceNoticeProps extends NoticeState {
  readonly onReload: () => void
}

export default function PersistenceNotice({ onReload, ...state }: PersistenceNoticeProps) {
  const [dismissedKind, setDismissedKind] = useState<NoticeKind | null>(null)
  const kind = selectNotice(state)
  if (kind === null || kind === dismissedKind) return null

  const dismiss: ToastAction = { label: 'Dismiss', onClick: () => setDismissedKind(kind) }
  const actions: readonly ToastAction[] =
    kind === 'newer-version' ? [{ label: 'Reload', onClick: onReload }, dismiss] : [dismiss]

  return <Toast message={NOTICE_MESSAGES[kind]} actions={actions} />
}
```

Run: `npx vitest run src/components/PersistenceNotice.test.tsx`
Expected: `4 passed`

- [ ] **Step 7: 先寫 E2E**

`e2e/storage-notices.spec.ts`：

```ts
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
```

`e2e/theme-color.spec.ts`：

```ts
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
```

- [ ] **Step 8: 確認 E2E 先失敗**

Run: `npx playwright test e2e/storage-notices.spec.ts e2e/theme-color.spec.ts --reporter=line --global-timeout=900000`
Expected: `15 failed`（5 個測試 × 3 個 project）：storage 被封鎖時整頁空白、沒有提示、theme-color 固定是 `#fafaf8`。

- [ ] **Step 9: 改寫 `src/App.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react'
import type { Edge, Node } from '@xyflow/react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import TabBar from './components/TabBar'
import PersistenceNotice from './components/PersistenceNotice'
import { useCanvasTabs } from './hooks/useCanvasTabs'
import { getBrowserStorage } from './persistence/workspaceStorage'
import { syncThemeColor } from './theme/themeColor'
import { readThemePreference, writeThemePreference, type Theme } from './theme/themePreference'
import type { SystemParams } from './types/topology'

function reloadPage(): void {
  window.location.reload()
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [storage] = useState(() => getBrowserStorage())
  const [theme, setTheme] = useState<Theme>(() =>
    readThemePreference(storage, window.matchMedia('(prefers-color-scheme: dark)').matches)
  )

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'warm', 'dream', 'cyberpunk')
    if (theme !== 'light') {
      document.documentElement.classList.add(theme)
    }
    writeThemePreference(storage, theme)
    syncThemeColor()
  }, [theme, storage])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setIsSidebarOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const {
    tabs,
    activeTab,
    activeTabId,
    addTab,
    switchTab,
    closeTab,
    renameTab,
    updateCanvasStateRef,
    saveError,
    persistenceBlocked,
    restoreFailed,
  } = useCanvasTabs()

  const handleCanvasStateChange = useCallback(
    (nodes: Node[], edges: Edge[], params: SystemParams) => {
      updateCanvasStateRef(activeTabId, nodes, edges, params)
    },
    [updateCanvasStateRef, activeTabId]
  )

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {isSidebarOpen && (
        <Sidebar />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={switchTab}
          onAddTab={addTab}
          onCloseTab={closeTab}
          onRenameTab={renameTab}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <Canvas
          key={activeTabId}
          theme={theme}
          setTheme={setTheme}
          initialNodes={[...activeTab.nodes]}
          initialEdges={[...activeTab.edges]}
          initialParams={activeTab.params}
          onStateChange={handleCanvasStateChange}
        />
      </div>
      <PersistenceNotice
        persistenceBlocked={persistenceBlocked}
        saveError={saveError}
        restoreFailed={restoreFailed}
        onReload={reloadPage}
      />
    </div>
  )
}

export default App
```

- [ ] **Step 10: 確認 E2E 通過**

Run: `npx playwright test e2e/storage-notices.spec.ts e2e/theme-color.spec.ts --reporter=line --global-timeout=900000`
Expected: `15 passed`

WebKit 如果無法用 `Object.defineProperty` 覆寫 `window.localStorage`（init script 拋出 TypeError），照 Global Constraints 的 WebKit 規則處理並回報，不要改測試的斷言。

- [ ] **Step 11: 單元測試、覆蓋率、型別、lint 與回歸測試**

```bash
npm test
npm run test:coverage
npm run build
npx eslint src/theme src/notices src/components/Toast.tsx src/components/PersistenceNotice.tsx src/App.tsx e2e
npm run lint 2>&1 | tail -1
npx playwright test --reporter=line --global-timeout=900000
npx playwright test e2e/storage-notices.spec.ts e2e/theme-color.spec.ts e2e/app-shell.spec.ts --reporter=line --global-timeout=1800000 --repeat-each=3
```

Expected：
- `npm test`：59 passed。
- `npm run test:coverage`：沒有 threshold 錯誤。
- build 成功；eslint 沒有輸出；`npm run lint` 最後一行 `✖ 9 problems (2 errors, 7 warnings)`。
- 完整 e2e：`169 passed`、`1 skipped`。
- 重複跑：`108 passed`（(3 + 2 + 7) × 3 個 project × 3），0 flaky。

- [ ] **Step 12: Commit**

```bash
git -C .. add frontend/src/theme frontend/src/notices frontend/src/components/Toast.tsx frontend/src/components/Toast.test.tsx frontend/src/components/PersistenceNotice.tsx frontend/src/components/PersistenceNotice.test.tsx frontend/src/App.tsx frontend/e2e/storage-notices.spec.ts frontend/e2e/theme-color.spec.ts
git -C .. commit -m "feat: add storage notices and sync theme color"
```

---

### Task 10: 離線時暫停自動分析

**Files:**
- Create: `frontend/src/hooks/useOnlineStatus.ts`、`frontend/src/hooks/useOnlineStatus.test.ts`、`frontend/e2e/offline-analysis.spec.ts`
- Modify: `frontend/src/components/Canvas.tsx`（import、`CanvasProps`、函式參數、自動分析 effect、工具列）、`frontend/src/App.tsx`（`<Canvas>` 多一個 prop）

**Interfaces:**
- Consumes：`useCanvasTabs()` 的 `persistenceBlocked`、`saveError`（Task 7）；e2e helper `ANALYSIS_SETTLE_MS`、`mockAnalysis`、`openApp`、`loadPreset`、`dropComponent`、`canvasNodes`
- Produces：
  - `useOnlineStatus(): boolean`（`useSyncExternalStore` 監聽 `online` / `offline`）
  - `Canvas` prop `persistenceHealthy?: boolean`（預設 `true`）
  - 離線提示文字（spec §5.5）：持久化正常時 `Offline — analysis paused. Results may be outdated. Changes are saved locally.`，否則 `Offline — analysis paused. Results may be outdated.`

- [ ] **Step 1: 先寫 `src/hooks/useOnlineStatus.test.ts`**

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useOnlineStatus } from './useOnlineStatus'

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })
  window.dispatchEvent(new Event(online ? 'online' : 'offline'))
}

describe('useOnlineStatus', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'onLine')
  })

  it('follows the browser online and offline events', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => setOnline(false))
    expect(result.current).toBe(false)

    act(() => setOnline(true))
    expect(result.current).toBe(true)
  })
})
```

Run: `npx vitest run src/hooks/useOnlineStatus.test.ts`
Expected: FAIL，找不到 `./useOnlineStatus`。

- [ ] **Step 2: 實作 `src/hooks/useOnlineStatus.ts`**

```ts
import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const getSnapshot = (): boolean => navigator.onLine
const getServerSnapshot = (): boolean => true

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

Run: `npx vitest run src/hooks/useOnlineStatus.test.ts`
Expected: `1 passed`

- [ ] **Step 3: 先寫 E2E `e2e/offline-analysis.spec.ts`**

```ts
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
```

Run: `npx playwright test e2e/offline-analysis.spec.ts --reporter=line --global-timeout=900000`
Expected: `3 failed`（沒有離線提示）。

- [ ] **Step 4: 修改 `Canvas.tsx`**

在 `import { generateNodeId } from '../utils/nodeId'` 下面加上：

```ts
import { useOnlineStatus } from '../hooks/useOnlineStatus'
```

`CanvasProps` 在 `initialParams?: SystemParams;` 下面加上一行：

```ts
  persistenceHealthy?: boolean;
```

函式宣告改成：

```ts
function Canvas({ theme, setTheme, initialNodes = [], initialEdges = [], initialParams, persistenceHealthy = true, onStateChange }: CanvasProps) {
```

在 `const [systemParams, setSystemParams] = useState<SystemParams>(() => initialParams ?? {})` 下面加上：

```ts
  const isOnline = useOnlineStatus()
```

自動分析的 effect 從：

```ts
    // Use a debounce timer to avoid excessive analysis requests during rapid changes
    const timer = setTimeout(() => {
      handleAnalyze()
    }, 800)

    return () => clearTimeout(timer)
  }, [nodes, systemParams, handleAnalyze])
```

改成：

```ts
    // Keep the last result while offline; analysis resumes when the connection returns.
    if (!isOnline) return

    // Use a debounce timer to avoid excessive analysis requests during rapid changes
    const timer = setTimeout(() => {
      handleAnalyze()
    }, 800)

    return () => clearTimeout(timer)
  }, [nodes, systemParams, handleAnalyze, isOnline])
```

工具列中，把：

```tsx
        {canSplit && (
          <ToolbarButton
            label="Split"
            onClick={splitSelectedNode}
            title="Split merged node back into individual components"
          />
        )}
        {analysisResult && (
```

換成：

```tsx
        {canSplit && (
          <ToolbarButton
            label="Split"
            onClick={splitSelectedNode}
            title="Split merged node back into individual components"
          />
        )}
        {!isOnline && (
          <span
            role="status"
            style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            {persistenceHealthy
              ? 'Offline — analysis paused. Results may be outdated. Changes are saved locally.'
              : 'Offline — analysis paused. Results may be outdated.'}
          </span>
        )}
        {analysisResult && (
```

- [ ] **Step 5: `App.tsx` 傳入持久化狀態**

`<Canvas>` 在 `initialParams={activeTab.params}` 下面加上：

```tsx
          persistenceHealthy={persistenceBlocked === null && saveError === null}
```

- [ ] **Step 6: 確認 E2E 通過**

Run: `npx playwright test e2e/offline-analysis.spec.ts --reporter=line --global-timeout=900000`
Expected: `3 passed`

- [ ] **Step 7: 單元測試、覆蓋率、型別、lint 與回歸測試**

```bash
npm test
npm run test:coverage
npm run build
npx eslint src/hooks/useOnlineStatus.ts src/hooks/useOnlineStatus.test.ts src/App.tsx e2e
npm run lint 2>&1 | tail -1
npx playwright test --reporter=line --global-timeout=900000
npx playwright test e2e/offline-analysis.spec.ts e2e/analysis.spec.ts --reporter=line --global-timeout=1800000 --repeat-each=3
```

Expected：
- `npm test`：60 passed。
- `npm run test:coverage`：沒有 threshold 錯誤。
- build 成功；eslint 沒有輸出；`npm run lint` 最後一行 `✖ 9 problems (2 errors, 7 warnings)`。
- 完整 e2e：`172 passed`、`1 skipped`。線上時工具列沒有任何新元素（spec §5.5），所以既有的截圖基準必須維持通過。
- 重複跑：`81 passed`（(1 + 8) × 3 個 project × 3），0 flaky。

- [ ] **Step 8: Commit**

```bash
git -C .. add frontend/src/hooks/useOnlineStatus.ts frontend/src/hooks/useOnlineStatus.test.ts frontend/src/components/Canvas.tsx frontend/src/App.tsx frontend/e2e/offline-analysis.spec.ts
git -C .. commit -m "feat: pause auto analysis while offline"
```

---

### Task 11: 新版本提示

**Files:**
- Create: `frontend/src/components/PwaUpdatePrompt.tsx`、`frontend/src/components/PwaUpdatePrompt.test.tsx`、`frontend/src/test/pwaRegisterMock.ts`
- Modify: `frontend/vitest.config.ts`（alias）、`frontend/src/App.tsx`（掛上 `PwaUpdatePrompt`）

**Interfaces:**
- Consumes：`useRegisterSW`（`virtual:pwa-register/react`，型別來自 Task 1 加入的 `vite-plugin-pwa/react`）；`Toast`（Task 9）；`PersistenceNotice`（Task 9）；`useCanvasTabs().flush(): SaveResult`（Task 7）
- Produces：`<PwaUpdatePrompt onBeforeUpdate={() => SaveResult} fallback={ReactNode} />`
  - 沒有新版本時只渲染 `fallback`（spec §7：更新提示優先於其他提示）。
  - 有新版本時顯示 `A new version is available.`，按鈕 **Reload**、**Later**。
  - **Reload**：先呼叫 `onBeforeUpdate()`；`ok: true` 就 `updateServiceWorker(true)`；`ok: false` 改顯示 `Your latest changes couldn't be saved. Reload anyway?`，按鈕 **Reload anyway**、**Cancel**（回到更新提示）。
  - **Later**：`setNeedRefresh(false)` 關閉提示。
  - 註冊時傳入不做任何事的 `onRegisterError`（spec §6.3：不顯示也不 log）。

- [ ] **Step 1: vitest 用的替身模組與 alias**

`src/test/pwaRegisterMock.ts`：

```ts
// Resolved in place of `virtual:pwa-register/react` under vitest; tests override it with vi.mock.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => undefined],
    offlineReady: [false, () => undefined],
    updateServiceWorker: () => Promise.resolve(),
  }
}
```

`vitest.config.ts` 改成（只多了 `node:url` import 與 `resolve.alias`）：

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/test/pwaRegisterMock.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/persistence/**/*.ts',
        'src/utils/nodeId.ts',
        'src/hooks/useCanvasTabs.ts',
        'src/hooks/useWorkspacePersistence.ts',
        'src/hooks/useOnlineStatus.ts',
        'src/components/PwaUpdatePrompt.tsx',
        'src/components/Toast.tsx',
        'src/components/PersistenceNotice.tsx',
        'src/notices/selectNotice.ts',
        'src/theme/themePreference.ts',
      ],
      exclude: ['src/**/*.test.{ts,tsx}'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
```

- [ ] **Step 2: 先寫 `src/components/PwaUpdatePrompt.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { SaveResult } from '../persistence/workspaceStorage'
import PwaUpdatePrompt from './PwaUpdatePrompt'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: vi.fn() }))

const UPDATE_MESSAGE = 'A new version is available.'
const UNSAVED_MESSAGE = "Your latest changes couldn't be saved. Reload anyway?"

describe('PwaUpdatePrompt', () => {
  let updateServiceWorker: ReturnType<typeof vi.fn<(reloadPage?: boolean) => Promise<void>>>
  let setNeedRefresh: ReturnType<typeof vi.fn>

  const mockRegistration = (needRefresh: boolean) => {
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [needRefresh, setNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    })
  }

  const renderPrompt = (result: SaveResult) => {
    const onBeforeUpdate = vi.fn((): SaveResult => result)
    render(<PwaUpdatePrompt onBeforeUpdate={onBeforeUpdate} fallback={<p>storage notice</p>} />)
    return onBeforeUpdate
  }

  beforeEach(() => {
    updateServiceWorker = vi.fn<(reloadPage?: boolean) => Promise<void>>(() => Promise.resolve())
    setNeedRefresh = vi.fn()
  })

  it('shows only the fallback while no update is waiting', () => {
    mockRegistration(false)

    renderPrompt({ ok: true })

    expect(screen.getByText('storage notice')).toBeTruthy()
    expect(screen.queryByText(UPDATE_MESSAGE)).toBeNull()
  })

  it('saves first and then activates the waiting update', () => {
    mockRegistration(true)
    const onBeforeUpdate = renderPrompt({ ok: true })
    expect(screen.queryByText('storage notice')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(onBeforeUpdate).toHaveBeenCalledTimes(1)
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
    expect(onBeforeUpdate.mock.invocationCallOrder[0]).toBeLessThan(updateServiceWorker.mock.invocationCallOrder[0])
  })

  it('asks before reloading when the latest changes could not be saved', () => {
    mockRegistration(true)
    renderPrompt({ ok: false, reason: 'quota' })

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(updateServiceWorker).not.toHaveBeenCalled()
    expect(screen.getByText(UNSAVED_MESSAGE)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reload anyway' }))

    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('returns to the update prompt on Cancel', () => {
    mockRegistration(true)
    renderPrompt({ ok: false, reason: 'blocked' })
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText(UPDATE_MESSAGE)).toBeTruthy()
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('closes the prompt on Later', () => {
    mockRegistration(true)
    renderPrompt({ ok: true })

    fireEvent.click(screen.getByRole('button', { name: 'Later' }))

    expect(setNeedRefresh).toHaveBeenCalledWith(false)
  })

  it('registers with a registration error handler that stays silent', () => {
    mockRegistration(false)
    renderPrompt({ ok: true })

    const options = vi.mocked(useRegisterSW).mock.calls[0][0]

    expect(typeof options?.onRegisterError).toBe('function')
    expect(() => options?.onRegisterError?.(new Error('blocked'))).not.toThrow()
  })
})
```

Run: `npx vitest run src/components/PwaUpdatePrompt.test.tsx`
Expected: FAIL，找不到 `./PwaUpdatePrompt`。

- [ ] **Step 3: 實作 `src/components/PwaUpdatePrompt.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { SaveResult } from '../persistence/workspaceStorage'
import Toast from './Toast'

interface PwaUpdatePromptProps {
  readonly onBeforeUpdate: () => SaveResult
  readonly fallback?: ReactNode
}

const UPDATE_MESSAGE = 'A new version is available.'
const UNSAVED_MESSAGE = "Your latest changes couldn't be saved. Reload anyway?"

function ignoreRegistrationError(): void {
  // spec §6.3: when registration fails the app keeps working as a normal website.
}

export default function PwaUpdatePrompt({ onBeforeUpdate, fallback = null }: PwaUpdatePromptProps) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: ignoreRegistrationError })
  const [confirmingUnsaved, setConfirmingUnsaved] = useState(false)

  if (!needRefresh) return <>{fallback}</>

  const activateUpdate = () => {
    void updateServiceWorker(true)
  }

  if (confirmingUnsaved) {
    return (
      <Toast
        message={UNSAVED_MESSAGE}
        actions={[
          { label: 'Reload anyway', onClick: activateUpdate },
          { label: 'Cancel', onClick: () => setConfirmingUnsaved(false) },
        ]}
      />
    )
  }

  const saveThenUpdate = () => {
    if (onBeforeUpdate().ok) {
      activateUpdate()
    } else {
      setConfirmingUnsaved(true)
    }
  }

  return (
    <Toast
      message={UPDATE_MESSAGE}
      actions={[
        { label: 'Reload', onClick: saveThenUpdate },
        { label: 'Later', onClick: () => setNeedRefresh(false) },
      ]}
    />
  )
}
```

Run: `npx vitest run src/components/PwaUpdatePrompt.test.tsx`
Expected: `6 passed`

- [ ] **Step 4: `App.tsx` 掛上更新提示**

在 `import PersistenceNotice from './components/PersistenceNotice'` 下面加上：

```tsx
import PwaUpdatePrompt from './components/PwaUpdatePrompt'
```

`useCanvasTabs()` 的解構在 `updateCanvasStateRef,` 下面加上 `flush,`。

把：

```tsx
      <PersistenceNotice
        persistenceBlocked={persistenceBlocked}
        saveError={saveError}
        restoreFailed={restoreFailed}
        onReload={reloadPage}
      />
```

換成：

```tsx
      <PwaUpdatePrompt
        onBeforeUpdate={flush}
        fallback={
          <PersistenceNotice
            persistenceBlocked={persistenceBlocked}
            saveError={saveError}
            restoreFailed={restoreFailed}
            onReload={reloadPage}
          />
        }
      />
```

- [ ] **Step 5: 確認 plugin 不再自動注入註冊 script**

```bash
npm run build
grep -c "registerSW.js" dist/index.html
```

Expected：build 成功；第二個指令印出 `0`（改由 `useRegisterSW` 註冊）。

- [ ] **Step 6: 單元測試、覆蓋率、lint 與回歸測試**

```bash
npm test
npm run test:coverage
npx eslint src/components/PwaUpdatePrompt.tsx src/components/PwaUpdatePrompt.test.tsx src/test src/App.tsx vitest.config.ts
npm run lint 2>&1 | tail -1
npx playwright test --reporter=line --global-timeout=900000
npx playwright test e2e/initial-load.spec.ts e2e/offline-shell.spec.ts --reporter=line --global-timeout=1800000 --repeat-each=3
```

Expected：
- `npm test`：66 passed。
- `npm run test:coverage`：全部列入門檻的檔案 ≥ 80%，沒有 threshold 錯誤。
- eslint 沒有輸出；`npm run lint` 最後一行 `✖ 9 problems (2 errors, 7 warnings)`。
- 完整 e2e：`172 passed`、`1 skipped`。`initial-load.spec.ts` 在封鎖 SW 的 project 仍然沒有 console error 與 `pageerror`（註冊失敗被 `onRegisterError` 接住）。
- 重複跑：`24 passed`（initial-load 2 個 × 3 個 project × 3 ＋ offline-shell 2 個 × SW project × 3），0 flaky。

- [ ] **Step 7: Commit**

```bash
git -C .. add frontend/src/components/PwaUpdatePrompt.tsx frontend/src/components/PwaUpdatePrompt.test.tsx frontend/src/test/pwaRegisterMock.ts frontend/vitest.config.ts frontend/src/App.tsx
git -C .. commit -m "feat: prompt before activating a new app version"
```

---

### Task 12: 文件與整體驗收

**Files:**
- Modify: `CLAUDE.md`、`README.md`

**Interfaces:**
- Consumes：Task 1～11 的全部成果
- Produces：spec §11 的文件更新；spec §10 的驗收結果（寫在報告中）

- [ ] **Step 1: 更新 `CLAUDE.md`**

在 `**Deployment:** ...` 那一行下面加上一個空行和：

````markdown
**PWA deployment rules:** Never use Vercel Instant Rollback to a deployment from before the PWA — its `/sw.js` is rewritten to `index.html`, so users stay on the cached version; revert and redeploy instead. To remove the PWA, first deploy `VitePWA({ selfDestroying: true })` and wait before removing the plugin. Keep `POST /api/topology` compatible with the previous frontend, because installed apps can keep running an older version.
````

在 `- \`cd frontend && npm run lint\` - ESLint` 下面加上：

````markdown
- `cd frontend && npm test` - Vitest unit tests
- `cd frontend && npm run test:coverage` - Unit tests with the 80% coverage threshold
````

並把 `(Chromium + WebKit, API mocked)` 改成 `(Chromium with and without a service worker, and WebKit; API mocked)`。

把 `- **Frontend State**: ...` 那一行換成下面兩行：

````markdown
- **Frontend State**: Managed in `Canvas.tsx` (nodes, edges, system params) with undo/redo history. Multi-tab support via `useCanvasTabs`, which restores every tab from localStorage (`architectmind:workspace`) and saves changes through `src/persistence/` and `useWorkspacePersistence` (500 ms debounce, writes only when the workspace changed). Sidebar visibility and theme live in `App.tsx`.
- **PWA**: `vite-plugin-pwa` (prompt mode) precaches the build and the self-hosted Caveat font; `PwaUpdatePrompt` asks before activating a new version, and auto analysis pauses while offline.
````

- [ ] **Step 2: 更新 `README.md`**

在 Features 清單的 `- **Multi-tab Support**: ...` 下面加上：

````markdown
- **Auto-save**: Every tab, its canvas, and its system parameters are saved in your browser and restored when you come back.
- **Installable & Offline-ready (PWA)**: Install ArchitectMind as an app; it opens offline, and analysis resumes when the connection returns.
````

把整個 `## ✅ Tests` 章節換成：

````markdown
## ✅ Tests

Backend tests run in the root directory:

```bash
go test ./... -v
```

Frontend tests run in `frontend/`:

```bash
npm test            # Vitest unit tests
npm run test:e2e    # Playwright regression suite (run `npx playwright install chromium webkit` once first)
```
````

- [ ] **Step 3: 確認 PR 1 的回歸基準沒有被改動（spec §10 第 1 項）**

```bash
git -C .. diff --stat test/e2e-regression-baseline -- frontend/e2e/initial-load.spec.ts frontend/e2e/app-shell.spec.ts frontend/e2e/properties.spec.ts frontend/e2e/editing.spec.ts frontend/e2e/analysis.spec.ts frontend/e2e/presets-exports.spec.ts frontend/e2e/visual.spec.ts frontend/e2e/real-backend.spec.ts frontend/e2e/fixtures
git -C .. diff --stat --diff-filter=MD test/e2e-regression-baseline -- 'frontend/e2e/*-snapshots'
git -C .. diff --name-only --diff-filter=A test/e2e-regression-baseline -- 'frontend/e2e/*-snapshots'
```

Expected：前兩個指令沒有輸出；第三個只列出三個 `-desktop-chromium-sw-darwin` 文字快照。

- [ ] **Step 4: 自動化驗收（spec §10 第 2～9、11、12 項）**

```bash
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npm run lint 2>&1 | tail -1
npx eslint src e2e playwright.config.ts vite.config.ts vitest.config.ts 2>&1 | grep -E "^\s+[0-9]+:[0-9]+\s+error" | grep -v "Sidebar.tsx" ; echo "new errors above (expected none)"
npm run build 2>&1 | grep -iE "PWA v|precache|will not be precached"
grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' dist/sw.js | head -1
grep -oE '[A-Za-z0-9_./-]+\.woff2' dist/sw.js | head -1
npm test
npm run test:coverage
npx playwright test --reporter=line --global-timeout=900000
npx playwright test --reporter=line --global-timeout=3600000 --repeat-each=3
```

Expected：
- 第一個指令沒有輸出；`npm run lint` 最後一行 `✖ 9 problems (2 errors, 7 warnings)`。
- build 有 `PWA v1.3.0` 與 precache 行，沒有 `will not be precached`；`dist/sw.js` 含 `assets/index-*.js` 與 `.woff2`（§10 第 11 項）。
- `npm test`：66 passed；`npm run test:coverage` 沒有 threshold 錯誤。
- 完整 e2e：`172 passed`、`1 skipped`；重複 3 次：`516 passed`、`3 skipped`，0 flaky。

在報告中把 §10 各項對應到通過的測試：
| §10 | 驗證方式 |
| --- | --- |
| 2 | `persistence.spec.ts`：restores tabs…、keeps new node ids unique… |
| 3 | `persistence.spec.ts`：keeps system parameters when switching tabs |
| 4 | `persistence.spec.ts`：keeps the undo result after a reload |
| 5 | `pwa.spec.ts`（manifest）、`offline-shell.spec.ts`（SW 接管）；安裝按鈕列入人工驗收 |
| 6 | `offline-shell.spec.ts`（離線重新整理與字型）、`offline-analysis.spec.ts` |
| 7 | `storage-notices.spec.ts`：corrupt |
| 8 | `storage-notices.spec.ts`：newer version |
| 9 | `persistence.spec.ts`：only a window with changes writes the workspace |
| 11 | Step 4 的 build 與 `dist/sw.js` 檢查 |
| 12 | Step 4 的 lint、build、單元、覆蓋率與 e2e |

- [ ] **Step 5: Commit 文件**

```bash
git -C .. add CLAUDE.md README.md
git -C .. commit -m "docs: document PWA, persistence and frontend tests"
```

- [ ] **Step 6: 停下來，把人工驗收清單交給使用者**

不要 push、不要開 PR。在報告中附上以下清單，標明「尚未由 agent 執行」：

1. **安裝按鈕（§10 第 5 項）**：`npm run build && npm run preview`，用 Chrome 開 `http://localhost:4173`，DevTools → Application 的 Manifest 沒有錯誤、Service Workers 顯示已啟用，網址列出現安裝按鈕。
2. **更新提示（§10 第 10 項）**：保持第 1 項的頁面開著並拖入一個元件；把 `vite.config.ts` 的 manifest `description` 暫時改一個字、重新 build 並重啟 preview；在 DevTools → Application → Service Workers 按 **Update**；頁面出現 `A new version is available.`，按 **Reload** 後畫布內容仍在；最後還原 `vite.config.ts`（`git checkout vite.config.ts`）。
3. **部署後（§10 第 13 項）**：部署到 Vercel 後執行 `curl -sI https://architect-mind.vercel.app/sw.js | grep -i cache-control` 與同樣的 `/manifest.webmanifest`，都要看到 `max-age=0`；再在正式網址重複第 1 項與離線重新整理。
4. **收尾**：驗收結束後在 DevTools 註銷 `localhost:4173` 的 service worker。
5. **真實後端**：8080 空出來後執行 `E2E_REAL_BACKEND=1 npx playwright test --project=real-backend`。
