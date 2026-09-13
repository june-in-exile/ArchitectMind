# PWA 與畫布持久化設計

- **日期**：2026-09-13
- **狀態**：已核准（2026-09-13）。分兩個 PR 實作，見 §14
- **範圍**：`frontend/`、`vercel.json`（後端不變）

## 1. 背景

ArchitectMind 目前是純線上的 SPA，有兩個問題：

1. **無法安裝、無法離線開啟。** 靜態資源沒有 service worker，也沒有 manifest。
2. **畫布內容只存在記憶體。** 只有 `theme` 寫入 localStorage（`App.tsx:10`），重新整理後 tabs、nodes、edges 全部消失。另外有兩個會影響持久化的既有 bug：
   - `systemParams` 放在 `Canvas` 自己的 local state（`Canvas.tsx:106`），`onStateChange` 只回傳 nodes 和 edges，所以**現在切換 tab 就會遺失系統參數**。
   - `onStateChange` 寫在 history effect 裡，而這個 effect 在 undo/redo 時會提前 return（`Canvas.tsx:199`），所以 **undo/redo 的結果不會回報給 `App`**。之後如果沒有其他變更，切換 tab 會回到 undo 前的內容。

## 2. 目標

- 可以安裝成 PWA（桌面與行動裝置），離線時也能開啟並編輯畫布。
- 所有 tab 的名稱、nodes、edges、系統參數，以及目前開啟的 tab，重新整理或關閉再開之後都還在。
- 離線時自動分析會暫停，並清楚告知使用者，不會一直顯示「後端沒有運作」的錯誤。
- 發布新版本時提示使用者重新載入，不會自動 reload 而清掉還沒存的內容。
- 儲存失敗（被瀏覽器封鎖、容量已滿、資料損壞、版本不相容）時，要讓使用者知道，不能默默遺失或覆蓋資料。
- **網頁版（桌面瀏覽器）既有的操作與畫面不變。** 除了 §9.3 列出的預期變更，其他差異都視為回歸。

## 3. 非目標

- 保存 undo/redo 歷史（重新載入後歷史會清空）
- 保存畫布的縮放與平移位置
- 跨視窗即時同步（多視窗採「最後寫入者勝」，見 §8）
- 匯入或匯出 workspace JSON 檔（已決定不做，影響見 §8、§13 第 1 項）
- 離線分析（把 Go 規則引擎編成 WASM）
- 定期在背景檢查新版本（只依靠瀏覽器在頁面載入時的檢查）
- 重構 `Canvas.tsx`（目前 1796 行，超過 800 行的上限，另外處理）
- 調整版面或樣式（字型來源除外，見 §9.3）。手機版 responsive 版面之後另寫 spec（§13 第 2 項）

## 4. 決策摘要

| 議題 | 選擇 | 考慮過但不採用的做法 |
| --- | --- | --- |
| 儲存位置 | **localStorage** | IndexedDB：非同步 API，初次 render 需要 loading 狀態，但一個 workspace 只有幾 KB，用不上它的優勢。後端儲存：需要帳號系統。 |
| 儲存時機 | **內容變更後 debounce 500ms，並在 `pagehide` 和 `visibilitychange: hidden` 時立即寫入；內容和上次存的一樣就不寫** | 只在 unload 時存：行動裝置和當機時不可靠。每次變更同步寫入：拖曳時每個 frame 都會 stringify。不做 dirty check：沒編輯過的舊視窗關閉時會蓋掉其他視窗的資料。 |
| 多視窗 | **最後寫入者勝，但只有內容真的變更過的視窗會寫入** | storage event 即時同步、偵測衝突後提示：複雜度高，單人使用幾乎不會遇到。 |
| 資料驗證 | **zod 4 schema；個別 param 欄位無效就丟掉該欄位，結構無效才整份作廢；較新的 `version` 不算損壞** | 整份嚴格驗證：`readWriteRatio` 用 `parseFloat` 可能產生 `NaN`，序列化後變成 `null`，會讓整份 workspace 被丟棄。把未知 `version` 當損壞：按 Later 的舊版視窗會覆寫新版資料。 |
| Node id | **維持 `node-N` 格式，還原時把計數器推進到現有最大值** | 改用 UUID：Mermaid、Excalidraw 匯出內容的 id 格式會改變，影響既有網頁行為。 |
| PWA 工具 | **`vite-plugin-pwa` 1.3（Workbox `generateSW`）** | 手寫 service worker：要自己維護 precache manifest 與版本清理。 |
| 更新策略 | **`registerType: 'prompt'`；flush 失敗時先詢問再 reload** | `autoUpdate`：會在使用者編輯途中 reload。 |
| Caveat 字型 | **改用 `@fontsource-variable/caveat` 自己 host，跟著 precache** | Google Fonts 加 runtime cache：第一次造訪時 SW 還沒接管頁面，字型不會被快取，之後離線就沒有字型。拿掉 Caveat：會改變視覺風格。 |
| Icons | **用 `@vite-pwa/assets-generator@1` 從 `public/favicon.svg` 產生一次，把 PNG commit 進 repo** | 裝成 devDependency：最新版 2.0 不符合 plugin 要求的 peer 版本（`^1.0.0`），而且只需要產生一次。 |
| 回歸防護 | **實作前先在 `main` 用 Playwright 建立既有行為的特性測試與截圖基準** | 只靠手動驗收：無法保證 `Canvas.tsx` 與 `App.tsx` 的修改沒有影響既有操作。 |

## 5. 架構

### 5.1 模組切分

```text
frontend/
├── e2e/                             # 新增：Playwright 回歸與 PWA 測試（§9.2、§9.3）
└── src/
    ├── App.tsx                      # 修改：theme 改用安全的 storage 存取、同步 theme-color
    ├── persistence/
    │   ├── workspaceSchema.ts       # zod schema 與 PersistedWorkspace 型別（純定義）
    │   ├── workspaceSerializer.ts   # tabs + 作用中 snapshot → PersistedWorkspace（純函式）
    │   └── workspaceStorage.ts      # 讀寫 Storage、錯誤分類（Storage 由參數注入）
    ├── utils/
    │   └── nodeId.ts                # 新增：從 Canvas.tsx 移出 generateNodeId，加上 seedNodeIdCounter
    ├── hooks/
    │   ├── useCanvasTabs.ts         # 修改：從 storage 還原、snapshot 標記 tabId、串接持久化
    │   ├── useWorkspacePersistence.ts  # 新增：debounce、dirty check、flush、生命週期事件、儲存錯誤狀態
    │   └── useOnlineStatus.ts       # 新增：useSyncExternalStore 監聽 online/offline
    └── components/
        ├── Toast.tsx                # 新增：共用的提示元件（只負責呈現）
        ├── PwaUpdatePrompt.tsx      # 新增：新版本提示
        └── Canvas.tsx               # 修改：initialParams、回報 params、離線暫停分析
```

每個單元的職責：

| 單元 | 做什麼 | 對外介面 | 依賴 |
| --- | --- | --- | --- |
| `workspaceSchema` | 定義持久化格式與驗證規則 | `workspaceSchema`、`PersistedWorkspace`、`PersistedTab` | zod |
| `workspaceSerializer` | 把執行期的狀態轉成可存檔的格式，並移除暫態欄位 | `toPersistedWorkspace(tabs, activeTabId, snapshot)` | schema 的型別 |
| `workspaceStorage` | 讀寫、解析、備份損壞資料、分類錯誤 | `getBrowserStorage()`、`loadWorkspace(storage)`、`saveWorkspace(storage, ws): SaveResult` | schema |
| `nodeId` | 產生不重複的 node id | `generateNodeId()`、`seedNodeIdCounter(ids)` | — |
| `useCanvasTabs` | 管理 tabs，並在初次載入時還原 | 既有回傳值，加上 `flush(): SaveResult`、`saveError: 'quota' \| null`、`persistenceBlocked: 'unavailable' \| 'newer-version' \| 'backup-failed' \| null`、`restoreFailed: boolean`；`updateCanvasStateRef` 改成 `(tabId, nodes, edges, params)` | storage、`useWorkspacePersistence`、`nodeId` |
| `useWorkspacePersistence` | 決定什麼時候存、要不要存 | `{ scheduleSave, flush, saveError }` | storage、serializer |
| `useOnlineStatus` | 回報是否在線 | `useOnlineStatus(): boolean` | — |
| `PwaUpdatePrompt` | 有新版本時提示，按下後先 flush，成功才更新 | `<PwaUpdatePrompt onBeforeUpdate={flush} />`，`onBeforeUpdate` 回傳 `SaveResult` | `virtual:pwa-register/react` |

`SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' | 'blocked' }`。內容沒變而跳過寫入，也算 `ok: true`。

### 5.2 持久化格式

- **Key**：`architectmind:workspace`
- **損壞備份 key**：`architectmind:workspace:corrupt`（只保留最近一份）

```json
{
  "version": 1,
  "activeTabId": "tab-1757700000000-1",
  "tabs": [
    {
      "id": "tab-1757700000000-1",
      "name": "Untitled 1",
      "nodes": [{ "id": "node-1", "type": "architecture", "position": { "x": 0, "y": 0 }, "data": { "label": "Client", "componentType": "client", "properties": {} } }],
      "edges": [{ "id": "edge-node-1-node-2", "source": "node-1", "target": "node-2", "type": "handdrawn", "data": { "connectionType": "sync" } }],
      "params": { "dau": 1000000, "availability": "99.9%" }
    }
  ]
}
```

**Schema 規則：**

- **`version`**：
  - `1`：正常解析。
  - 大於 `1` 的整數：代表資料是較新版本的 App 寫入的，例如另一個視窗已經更新，而這個視窗按了 Later。回傳 `unsupported-version`，**不備份、不覆寫**，這個視窗停用持久化（見 §5.4）。
  - 其他值（缺少、非整數、小於 1）：視為損壞。
- **`tabs`**：至少 1 個。
- **node**：必要欄位是 `id`（string）、`position.x` 和 `position.y`（number）、`data`（object）。其他欄位用 `z.looseObject` 保留，例如 `type`、`width`、`height`。
- **edge**：必要欄位是 `id`、`source`、`target`（string）。其他欄位保留，例如 `data`、`style`、`type`、`sourceHandle`、`targetHandle`、`animated`。
- **`params`**：只保留 `SystemParams` 定義的 8 個欄位。
  - 數值欄位必須是有限數字。
  - `latencyTarget`、`availability` 必須是 string。
  - 不符合的欄位直接丟掉，不影響整份資料。
  - schema 的欄位要和 `SystemParams` 保持一致：加上型別檢查（`z.infer` 的結果與 `SystemParams` 必須能互相指派）和單元測試，避免之後新增參數時，存檔默默丟掉新欄位。
- **`activeTabId`**：找不到對應的 tab 時，改用第一個 tab，不視為損壞。

**Serializer 會移除的暫態欄位：**

- **node**：`selected`、`dragging`、`resizing`、`measured`
- **edge**：`selected`

warning 標記是 render 時才從分析結果算出來的（`Canvas.tsx:1367`），不在 node state 裡，所以不需要處理。

所有轉換都回傳新物件，不修改輸入。

### 5.3 資料流

```text
Canvas（nodes / edges / systemParams 變更，包含 undo/redo）
  └─ 獨立的 useEffect → onStateChange(nodes, edges, params)
       └─ App.handleCanvasStateChange → updateCanvasStateRef(activeTabId, nodes, edges, params)
            ├─ canvasStateRef = { tabId, nodes, edges, params }
            └─ scheduleSave()                          ─┐
                                                        ├─ 500ms debounce
Tab 操作（新增 / 切換 / 關閉 / 改名）→ tabs 或 activeTabId 變更 ─┘
                                                        ▼
            persistenceBlocked？ ── 是 → 不寫入
                                                        ▼ 否
            json = JSON.stringify(toPersistedWorkspace(tabsRef, activeTabIdRef, canvasStateRef))
                                                        ▼
            json === lastPersistedJson？ ── 是 → 不寫入
                                                        ▼ 否
            saveWorkspace(storage, json) → 成功才更新 lastPersistedJson；更新 saveError

立即 flush 的時機：pagehide、visibilitychange(hidden)、按下「Reload」更新、unmount
```

**只在內容變更時寫入（dirty check）：**

- `useWorkspacePersistence` 記住這個視窗最後一次成功讀取或寫入的 JSON 字串（`lastPersistedJson`）。
- 寫入前先序列化，字串相同就跳過。
- 只有 `setItem` 成功後才更新 `lastPersistedJson`，所以寫入失敗時，下次 debounce 或 flush 會重試。
- 初始值是「還原後的狀態經過 serializer」的結果，所以 `Canvas` 掛載時的第一次回報不會寫入。就算 React Flow 補上的欄位讓字串有差異，也只是多寫一次，不影響正確性。
- **為什麼需要：** `pagehide` 和 `visibilitychange` 在任何視窗關閉或切走時都會觸發。沒有 dirty check 的話，一個開著但沒編輯過的舊視窗關閉時，會把舊資料整份寫回去，蓋掉使用者在另一個視窗做的所有修改。

**Snapshot 要標記 tabId：** `canvasStateRef` 記錄這份內容屬於哪個 tab。serializer 只在 `snapshot.tabId === activeTabId` 時，才用 snapshot 覆蓋該 tab 的內容。

這樣可以避免一個競態：切換或關閉 tab 後、新的 `Canvas` 還沒回報之前，ref 裡還是舊 tab 的內容，可能被錯寫到新的作用中 tab。`tabId` 由 `App` 從 props 傳入，不從 hook 內的 ref 讀取。原因是子元件的 effect 會先於父層 effect 執行，從 ref 讀到的可能還是舊值。

**`useCanvasTabs` 內既有函式的修正：**

- `saveCurrentCanvasState`（新增、切換 tab 時把 snapshot 寫回 `tabs`）同樣要檢查 `snapshot.tabId === activeTabId`，不符就不寫。
- `closeTab` 目前在 `setTabs` 的 updater 裡呼叫 `setActiveTabId`（`useCanvasTabs.ts:80`）。StrictMode 會執行 updater 兩次，而且 updater 不該有副作用。修改時改成在 updater 外算出新的作用中 tab，再分別更新。

**timer 讀取最新狀態：** debounce 的 callback 透過 ref 讀取 `tabs`、`activeTabId`、snapshot，避免 closure 抓到舊值。

### 5.4 初始載入

`useCanvasTabs` 用 lazy initializer 同步呼叫 `loadWorkspace(getBrowserStorage())`，localStorage 是同步 API，所以不需要 loading 狀態。

| `loadWorkspace` 結果 | 初始狀態 | 提示 |
| --- | --- | --- |
| `{ status: 'loaded', workspace }` | 使用存檔的 tabs 與 activeTabId | 無 |
| `{ status: 'empty' }` | 一個 `Untitled 1` 空白 tab（沿用現有行為） | 無 |
| `{ status: 'corrupt', backedUp: true }` | 一個空白 tab；原始字串已備份到 `:corrupt` key | 「Your saved workspace couldn't be restored. A backup was kept in this browser.」 |
| `{ status: 'corrupt', backedUp: false }` | 一個空白 tab；**不覆寫主 key**，持久化停用（`backup-failed`） | 「Your saved workspace couldn't be restored or backed up. To protect it, changes in this window won't be saved.」 |
| `{ status: 'unsupported-version' }` | 一個空白 tab；不備份、不覆寫，持久化停用（`newer-version`） | 「This workspace was saved by a newer version of ArchitectMind. Reload to update — changes in this window won't be saved.」附 **Reload** 按鈕（`location.reload()`） |
| `{ status: 'unavailable' }` | 一個空白 tab，只在記憶體中運作（`unavailable`） | 同 §7 的 `unavailable` |

**載入時的其他規則：**

- **只讀一次：** 同一份 `loadWorkspace` 結果要同時決定 `tabs`、`activeTabId`、提示狀態。放在同一個 lazy initializer，不要分成兩次讀取。
- **備份要冪等：** StrictMode 下 lazy initializer 會執行兩次，所以寫入備份必須冪等（同一個字串寫到同一個 key）。
- **推進 node id 計數器：** 還原後呼叫 `seedNodeIdCounter`。它會找出所有 tab 裡符合 `node-<數字>` 的 id，把計數器推進到其中的最大值，而且不會往回調。
  - **為什麼需要：** `Canvas.tsx:43` 的 `nodeIdCounter` 是模組變數，重新整理後會從 0 開始。沒有這一步的話，還原 `node-1`～`node-5` 之後新增的 node 又會拿到 `node-1`。React Flow 會把兩個 node 當成同一個，edge 接錯、刪除時一起消失，送到後端的分析也會錯。
- **請求持久儲存：** 第一次成功寫入後呼叫 `navigator.storage?.persist?.()`。這是 best-effort，忽略結果，用來降低瀏覽器空間不足時清除資料的機率。

### 5.5 Canvas 的修改（盡量少改）

- **新增 prop**：`initialParams?: SystemParams`，用來初始化 `systemParams`。`App` 傳入 `activeTab.params`。
- **`onStateChange`**：
  - 簽名改成 `(nodes, edges, params: SystemParams) => void`。
  - **移出 history effect，改成獨立的 effect**：`useEffect(() => { onStateChange?.(nodes, edges, systemParams) }, [nodes, edges, systemParams, onStateChange])`。
  - history effect 本身（包含 `isUndoRedoRef` 的提前 return）不動。
  - 這一項同時修掉「切換 tab 會遺失參數」和「undo/redo 結果不回報」兩個問題。
- **Node id**：`generateNodeId` 移到 `utils/nodeId.ts`，格式維持 `node-N`，所以匯出內容不變。
- **離線處理**：
  - `const isOnline = useOnlineStatus()`。
  - 自動分析的 effect 在 `!isOnline` 時直接 return。保留上一次的分析結果，不清空。
  - deps 加上 `isOnline`，恢復連線後會自動重新分析。
  - 在分析結果區塊顯示「Offline — analysis paused. Results may be outdated.」。只有持久化正常時，才接著顯示「Changes are saved locally.」，避免在只存在記憶體時誤導使用者。
  - 線上但後端無法連線的情況，沿用既有的錯誤訊息。
  - **線上時的畫面與行為和現在完全相同**，不顯示任何新元素。

### 5.6 App 的修改

- **theme 的 storage 存取**：`App.tsx:10` 的 `getItem` 和 `App.tsx:20` 的 `setItem` 改成透過 `getBrowserStorage()`，並包在 try/catch 裡。
  - **為什麼需要：** 瀏覽器封鎖網站資料時，存取 `window.localStorage` 會拋出 `SecurityError`。現在 `App` 在第一次 render 就會拋錯、整頁空白，§7 的 `unavailable` 降級根本走不到。
  - storage 可以用時，行為和現在完全相同。
- **`<meta name="theme-color">`**：在既有的 theme effect 裡，把它同步成目前主題的 `--bg-primary`。
  - **為什麼需要：** 固定 `#fafaf8` 會讓 dark、cyberpunk 等主題的安裝版 App 標題列變成淺色。
  - 沒有 theme-color 時，Safari 本來就會取頁面背景色，所以同步之後，網頁版的外觀跟現在一致。
- **提示**：`App` 掛上 `Toast` 與 `PwaUpdatePrompt`，優先順序見 §7。

## 6. PWA 外殼

### 6.1 `vite.config.ts`

```ts
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
})
```

- **`id`**：固定安裝識別。之後就算改了 `start_url`，已安裝的 App 也不會被當成另一個 App。
- **快取大小**：目前最大的 chunk 是 957 KB（`index-*.js`），低於 Workbox 預設的 2 MiB 上限，precache 總量約 1.4 MB，另外加上字型。
  - **風險：** 之後 chunk 超過 2 MiB 時，Workbox 只會印出警告並**略過該檔**，build 不會失敗，但離線開啟會壞掉。
  - **防護：** §10 要求 build 後檢查 precache 清單。
- **`/api/*`**：不經過 SW 的 navigation fallback。`POST /api/topology` 本來就不會被 Cache API 快取。
- **開發環境**：不啟用 SW，避免和 HMR 互相干擾。

### 6.2 其他檔案

- **`index.html`**：
  - 移除 Google Fonts 的 `preconnect` 與 stylesheet。
  - 新增 `<meta name="theme-color" content="#fafaf8">`（執行時由 `App` 同步，見 §5.6）、`<meta name="description">`、`<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">`。
  - manifest 的 link 由 plugin 自動注入。
- **`main.tsx`**：`import '@fontsource-variable/caveat'`。
- **`index.css`**：`--font-hand` 改成 `'Caveat Variable', 'Caveat', 'Virgil', 'Comic Neue', cursive`。
- **`public/`**：新增 `pwa-64x64.png`、`pwa-192x192.png`、`pwa-512x512.png`、`maskable-icon-512x512.png`、`apple-touch-icon-180x180.png`、`favicon.ico`。
  - 產生方式：在 `frontend/` 執行 `npx @vite-pwa/assets-generator@1 --preset minimal-2023 public/favicon.svg`。
- **`tsconfig.app.json`**：`types` 加上 `vite-plugin-pwa/react`。
- **`package.json`**：`dependencies` 加上 `zod@^4` 與 `@fontsource-variable/caveat`；測試相關套件見 §9.1。
- **`vercel.json`**：`rewrites` 不變，另外加上 `headers`，明確設定不快取 SW 與 manifest，不依賴 Vercel 的預設值：

  ```json
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] },
    { "source": "/manifest.webmanifest", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] }
  ]
  ```

  - `sw.js`、`manifest.webmanifest`、`workbox-*.js` 都是 `dist` 裡的靜態檔，會先直接回傳，不經過 `/(.*)` 的 rewrite。

### 6.3 更新提示

`PwaUpdatePrompt` 使用 `useRegisterSW()`：

- **`needRefresh` 為 true 時**：顯示 Toast「A new version is available.」，以及兩個按鈕 **Reload**、**Later**。
  - **Reload**：先呼叫 `onBeforeUpdate()`（flush 持久化）。
    - 回傳 `ok: true`：呼叫 `updateServiceWorker(true)`。
    - 回傳 `ok: false`（容量已滿、storage 不可用、持久化停用）：**不 reload**，Toast 改成「Your latest changes couldn't be saved. Reload anyway?」，按鈕是 **Reload anyway**、**Cancel**。
  - **Later**：關閉提示，下次載入時再檢查。
- **其他開著的視窗**：新 SW 接管後，vite-plugin-pwa 會讓所有收到提示的視窗一起 reload。這些視窗透過 `pagehide` flush 存檔（有變更才寫入），仍受 §8 多視窗限制。
- **`offlineReady`**：不顯示提示，避免干擾。
- **`onRegisterError`**：不顯示也不 log，App 照常以一般網站運作。

### 6.4 回滾與移除

- **不要用 Vercel Instant Rollback 退回 PWA 之前的部署。**
  - 舊部署沒有 `/sw.js`，這個請求會被 `/(.*)` rewrite 成 `index.html`，回傳 200 和 `text/html`。
  - SW 更新檢查因此失敗，已經載入過 SW 的使用者會一直停在快取中的版本，看不到回滾結果。
- **要回滾前端時**：revert commit 後重新部署。新部署仍然包含 SW，更新提示會照常出現。
- **要完全移除 PWA 時**：
  1. 先部署 `VitePWA({ selfDestroying: true })` 的版本，讓既有的 SW 自行註銷。
  2. 觀察一段時間，確認使用者都已更新後，才移除 plugin。
- **API 相容性**：使用者按 Later，或安裝版 App 一直沒關閉時，會繼續執行舊版前端。之後修改 `POST /api/topology` 時，後端要對前一版前端保持相容。

## 7. 錯誤處理

| 情況 | 偵測方式 | 行為 | 使用者看到的訊息 |
| --- | --- | --- | --- |
| storage 被封鎖（瀏覽器設定封鎖網站資料） | 存取 `window.localStorage`，或寫入 probe key 時拋出例外 | `getBrowserStorage()` 回傳 `null`；theme 與 workspace 都只在記憶體中運作 | 「This browser is blocking local storage — changes won't be kept after you close the app.」（可關閉） |
| 容量已滿 | `setItem` 拋出 `QuotaExceededError` | `saveError = 'quota'`，下次變更或 `pagehide` 時重試，成功後自動清除提示 | 「Storage is full — recent changes couldn't be saved.」 |
| JSON 解析失敗、結構不合 schema、`version` 無效 | `JSON.parse` 或 `safeParse` 失敗 | 備份成功：原始字串備份到 `:corrupt` key，改用空白 tab。備份失敗：改用空白 tab，不覆寫主 key，停用持久化 | 見 §5.4 |
| 存檔由較新版本寫入 | `version` 是大於 1 的整數 | 不備份、不覆寫，停用持久化 | 見 §5.4 |
| 個別 param 欄位無效 | 該欄位的 schema 驗證失敗 | 丟掉該欄位，其餘資料照常還原 | 無 |
| `activeTabId` 找不到 | 還原時比對 | 使用第一個 tab | 無 |
| 更新時 flush 失敗 | `onBeforeUpdate()` 回傳 `ok: false` | 不 reload，改成詢問是否仍要 reload | 見 §6.3 |
| 離線 | `useOnlineStatus()` 為 false | 暫停自動分析，恢復連線後重新分析 | 見 §5.5 |
| SW 註冊失敗 | `onRegisterError` | 忽略 | 無 |

- **Toast 同時只顯示一則**，優先順序：
  1. 更新提示（包含「Reload anyway?」確認）
  2. 持久化停用（`newer-version`、`backup-failed`、`unavailable`）
  3. 儲存失敗（`quota`）
  4. 還原失敗（`corrupt` 且已備份）
- 使用者關閉的提示，只有在錯誤種類改變時才會再出現。
- UI 文案沿用 App 現有的英文介面。

## 8. 已知限制

- **多視窗互相覆蓋**：兩個視窗都有編輯時，後寫入的會整份蓋掉先寫入的。沒有編輯過的視窗不會寫入（§5.3），所以開著不動的舊視窗不會覆蓋資料。
- **Safari 可能清除資料**：在 Safari 的一般分頁（非安裝的 App）連續 7 天沒有互動時，ITP 可能清除 localStorage。安裝到主畫面的 PWA 不受影響。
- **Safari 安裝版 App 與瀏覽器分頁不共用資料**：iOS／iPadOS 的「加入主畫面」，以及 macOS Safari 的「加入 Dock」，都使用獨立的儲存空間。使用者在 Safari 分頁畫好的圖，安裝後的 App 裡看不到。已決定不做匯入匯出，所以沒有搬移資料的方法，接受這個限制（§13 第 1 項）。
- **Safari 私密模式**：可以正常寫入，但關閉視窗後資料會被清除。這種情況無法偵測，所以不會顯示提示。
- **假在線**：連上 Wi-Fi 但實際無法上網時，`navigator.onLine` 仍是 `true`，會顯示既有的後端錯誤訊息，不會顯示離線提示。
- **容量上限**：localStorage 約 5 MB。以目前每張圖幾 KB 來看，可容納數百個 tab。損壞備份只保留一份，下次再損壞時會覆蓋舊的備份。
- **undo/redo 歷史不保存**：重新載入後，undo 堆疊是空的。
- **舊版本持續執行**：按 Later，或安裝版 App 一直沒有完全關閉時，會繼續使用舊版前端（見 §6.4 的 API 相容性）。

## 9. 測試

### 9.1 測試基礎設施（目前沒有，需要新增）

- **分期**：`@playwright/test`、`playwright.config.ts`、`tsconfig.e2e.json`、`test:e2e` script 屬於 PR 1；其餘項目屬於 PR 2（§14）。
- **devDependencies**：`vitest@5`、`@vitest/coverage-v8@5`（版本需與 vitest 完全相同）、`jsdom`、`@testing-library/react`、`@testing-library/dom`、`@playwright/test`。
- **Node 版本**：vitest 5 需要 Node `^22.12 || ^24 || >=26`，jsdom 30 需要 `^22.22.2 || ^24.15 || >=26`。
  - Vercel 的 `buildCommand` 只跑 `tsc -b && vite build`，不跑測試。`npm install` 時版本不符只會出現 `EBADENGINE` 警告，不影響部署。
  - 本機與之後的 CI 跑測試時，Node 版本必須符合要求。
- **`vitest.config.ts`**：
  - 獨立設定檔，只載入 react plugin，不跑 `VitePWA`。
  - `test.include` 限定 `src/**/*.test.{ts,tsx}`。否則 vitest 預設也會執行 `e2e/*.spec.ts`，把 Playwright 測試當成 vitest 測試而失敗。
  - 把 `virtual:pwa-register/react` alias 到測試用的 mock。
- **TypeScript**：
  - `tsconfig.app.json` 的 `include: ["src"]` 會讓 `npm run build`（`tsc -b`）連測試檔一起型別檢查。測試檔要明確寫 `import { describe, it, expect } from 'vitest'`。
  - `vitest.config.ts`、`playwright.config.ts`、`e2e/` 目前不在任何 tsconfig 裡。另建 `tsconfig.e2e.json`（`e2e` 裡的 `page.evaluate` 需要 DOM lib），並加進 `tsconfig.json` 的 `references`。
- **scripts**：`test`（`vitest run`）、`test:coverage`、`test:e2e`（`playwright test`）。
- **覆蓋率門檻 80%**：`persistence/`、`utils/nodeId.ts`、`useCanvasTabs`、`useWorkspacePersistence`、`useOnlineStatus`、`PwaUpdatePrompt`、`Toast`。`useCanvasTabs` 的競態邏輯風險最高，必須包含在內。

### 9.2 既有網頁行為回歸測試（Playwright，實作前先建立）

**目的：** 確認加入 PWA 與持久化之後，桌面瀏覽器上既有的行為和畫面都沒有改變。

**做法：**

1. **Step 0（PR 1，任何實作之前）**：從目前的 `main`（`ecaebc2`）開分支，寫好下列測試並確認全部通過，把截圖基準一起 commit。PR 1 不修改 `src/`。這些是描述「現在行為」的特性測試，在 `main` 上本來就應該通過，所以不走 RED 階段。
2. 之後每個實作步驟都要讓這組測試保持通過。
3. **不可以為了讓測試通過而修改這組測試。** 唯一的例外是 §9.3 列出的預期變更，而且要在同一個 commit 的訊息裡說明。

**設定（`playwright.config.ts`）：**

- **`webServer`**：`npm run build && npm run preview`。使用 production build，PR 2 之後會真的註冊 SW。
- **viewport**：桌面 1440×900。
- **projects**：
  - `desktop-chromium-no-sw`：設定 `serviceWorkers: 'block'`，模擬第一次造訪、還沒有 SW 的一般網頁使用者。
  - `desktop-chromium-sw`：允許 SW，確認 SW 接管之後行為一樣。**PR 2 才加入**，因為 `main` 上還沒有 SW。
  - `desktop-webkit`（建議）：Safari 使用者。
- **API mock**：`/api/topology` 用 `context.route` 回傳固定的 fixture，讓分析結果穩定。
  - **待驗證的假設：** SW 接管頁面後，`context.route` 仍然攔得到 `POST /api/topology`。Playwright 文件建議搭配 routing 時設定 `serviceWorkers: 'block'`，所以這一點要在 PR 2 實作計畫的第一步驗證（PR 1 時還沒有 SW，無法驗證）。
  - 如果假設不成立：`desktop-chromium-sw` 改成不 mock、直接打本機 Go 後端，或只跑不依賴分析結果的案例；`desktop-chromium-no-sw` 照常使用 mock。
- **真實後端 smoke test**：另外保留 1 個不 mock 的測試，打本機 Go 後端（`go run _cmd/main.go`）。
- **隔離**：每個測試都用全新的 browser context，localStorage 和 SW 都是乾淨的。

**必須涵蓋的既有行為：**

| 區塊 | 測試案例 |
| --- | --- |
| 初次載入 | 只有一個 `Untitled 1` tab、畫布空白、Sidebar 展開；沒有 Toast、沒有離線提示，console 沒有 error |
| Sidebar | 從 Sidebar 拖曳元件到畫布會建立 node；`Ctrl/Cmd+B` 可以收合與展開 |
| 連線與屬性 | 連接兩個 node 會產生 edge；在 ComponentPropertyPanel、EdgePropertyPanel、SystemParamsPanel 修改後，畫面跟著更新 |
| 自動分析 | 變更後約 800ms 送出 `POST /api/topology`，快速連續變更只送一次；request body 的欄位與基準相同；warnings 會顯示，點擊後聚焦到對應 node；刪除所有 node 後結果清空 |
| 後端錯誤 | API 回傳 500 或連線中斷時，顯示既有訊息「Please ensure the backend service is running and try again.」 |
| Tabs | 新增、切換、改名、關閉都正常；只剩一個 tab 時不能關閉；各 tab 的 nodes 和 edges 互不影響 |
| 編輯 | Shift+drag 複製、copy/paste、select all、undo/redo、Merge（`Ctrl+M`）與 Split |
| Presets | Basic、Twitter、YouTube、Google 載入後，node 與 edge 數量和基準相同 |
| 匯出 | Mermaid、Excalidraw、Image、PDF 都會觸發下載；Mermaid 與 Excalidraw 的內容和基準快照相同，藉此確認 node id 格式沒變 |
| 主題 | 5 個主題都能切換；重新整理後主題仍保留 |
| 視覺 | 用 `toHaveScreenshot` 截圖：空白畫布、Basic preset、打開 SystemParamsPanel，light 與 dark 主題各一張。主要用來抓出 Caveat 字型改成自己 host 後的差異 |

**截圖注意事項：**

- 截圖結果跟作業系統和字型渲染有關。基準要在同一個環境產生與比對，例如都在本機 macOS，或都在 Playwright 的 Docker image。
- 截圖前等待 `document.fonts.ready`，並設定 `animations: 'disabled'`，關掉 warning 的脈動動畫。
- 允許很小的差異，例如 `maxDiffPixelRatio: 0.01`。
- Google Fonts 與 fontsource 提供的是同一套 Caveat 字型，差異應該在門檻內。如果超過門檻，要人工確認，不可以直接更新基準。

### 9.3 預期的行為變更（只有這些可以與基準不同）

| # | 變更 | 原本 | 之後 | 對應的新測試（先寫、RED） |
| --- | --- | --- | --- | --- |
| 1 | 重新整理後還原 | 畫布清空 | tabs、內容、參數、作用中 tab 都還原 | E2E |
| 2 | 切換 tab 保留參數 | 參數遺失 | 參數保留 | `useCanvasTabs` 單元測試、E2E |
| 3 | undo/redo 後切換 tab 或重新整理 | 回到 undo 前的內容 | 保留 undo 後的結果 | E2E |
| 4 | 離線時的分析 | 顯示後端錯誤 | 暫停分析並顯示離線提示 | E2E（`context.setOffline(true)`） |
| 5 | 有新版本時 | 無 | 出現更新提示 | `PwaUpdatePrompt` 單元測試、§10 手動驗收 |
| 6 | storage 異常 | 沒有提示；storage 被封鎖時整頁空白 | App 正常運作並顯示 Toast | 單元測試；E2E 用 `addInitScript` 讓 `localStorage` getter 拋出例外 |
| 7 | 字型來源 | Google Fonts | 自己 host（外觀應在截圖門檻內） | §9.2 視覺回歸 |
| 8 | `<meta name="theme-color">` | 無 | 跟隨目前主題的背景色 | E2E 檢查 meta 值 |

### 9.4 單元測試（依 TDD 先寫）

| 對象 | 測試案例 |
| --- | --- |
| `workspaceSchema` | 合法資料通過；缺少 `tabs`、node 缺少 `position` 時失敗；`version: 2` 判定為較新版本，不是損壞；`version: 0`、`"1"` 判定為損壞；`params` 裡的 `null` 和 `NaN` 被丟掉，其他欄位保留；未知的 node 和 edge 欄位被保留；params schema 的欄位與 `SystemParams` 一致 |
| `workspaceSerializer` | 作用中 snapshot 會覆蓋對應的 tab；`tabId` 不符時忽略 snapshot；移除暫態欄位；不修改輸入物件 |
| `workspaceStorage` | 存檔再讀取結果一致；`empty` 狀態；`corrupt` 且備份成功（`backedUp: true`）；寫入備份時拋出例外（`backedUp: false`，而且主 key 沒有被改動）；`unsupported-version` 不寫入任何 key；`unavailable`（取得 storage 或寫入 probe 時拋出例外）；`setItem` 拋出 quota 錯誤時回傳 `{ ok: false, reason: 'quota' }` |
| `nodeId` | 從 `node-3`、`node-12`、`demo-client` 推進後，下一個 id 是 `node-13`；沒有符合格式的 id 時從目前值繼續；不會往回調 |
| `useWorkspacePersistence` | 用 fake timers 驗證 500ms 內多次變更只寫一次；`pagehide` 和 `visibilitychange` 會立即寫入；**內容沒變時 flush 不寫入**；寫入失敗後，下次 flush 會重試；寫入成功後清除 `saveError`；持久化停用時不寫入，且 `flush` 回傳 `ok: false` |
| `useCanvasTabs` | 有存檔時還原 tabs 與 activeTabId；還原後呼叫 `seedNodeIdCounter`；新增、改名、關閉 tab 後會存檔；切換 tab 後 params 仍在；snapshot 的 `tabId` 不符時，`saveCurrentCanvasState` 不寫入；關閉作用中的 tab 後，activeTabId 指向相鄰的 tab |
| `useOnlineStatus` | 觸發 `offline` 和 `online` 事件時，回傳值跟著改變 |
| `PwaUpdatePrompt` | `needRefresh` 時顯示；按 Reload 且 flush 成功時，依序呼叫 `onBeforeUpdate` 與 `updateServiceWorker(true)`；flush 失敗時不呼叫 `updateServiceWorker`，並顯示 Reload anyway 與 Cancel；按 Later 會關閉 |
| theme 存取（從 `App.tsx` 抽出的函式） | storage 為 `null` 或拋出例外時，回傳預設主題而且不拋錯 |

**`Canvas.tsx`、`App.tsx`**：在 jsdom 裡跑 React Flow 的成本太高，不寫單元測試，改由 §9.2 的回歸測試和 §9.3 新增的 E2E 覆蓋。

## 10. 驗收標準

在 `npm run build && npm run preview` 的環境，同時執行 Go 後端（`go run _cmd/main.go`，`vite preview` 會沿用 `server.proxy`），用 Playwright 或 Chrome DevTools 驗證：

1. §9.2 的回歸測試全部通過。跟 PR 1 的版本比較，這組測試只在 §9.3 範圍內有改動（加入 `desktop-chromium-sw` project 除外）。
2. 建立 2 個 tab，放入 nodes、edges，設定系統參數後重新整理：tabs、內容、參數、目前開啟的 tab 都還原。接著再新增一個 node，畫布上所有 node 的 `data-id` 都不重複。
3. 設定參數後切換到另一個 tab 再切回來：參數還在（修正既有 bug）。
4. 刪除一個 node，按 undo 之後重新整理：node 仍在（修正既有 bug）。
5. 在 DevTools 的 Application 分頁檢查：manifest 沒有錯誤，SW 已啟用，Chrome 網址列出現安裝按鈕。
6. 勾選 Offline 後重新整理：App 能開啟，Caveat 字型正常，可以編輯，分析區塊顯示離線提示。取消 Offline 後會自動重新分析。
7. 手動把 `architectmind:workspace` 改成不合法的 JSON 後重新整理：出現還原失敗提示，`:corrupt` key 裡有原始字串，App 可以正常使用。
8. 手動把 `version` 改成 `2` 後重新整理：出現較新版本提示。編輯畫布之後，`architectmind:workspace` 的內容沒有被改動，也沒有產生 `:corrupt` key。
9. 開兩個視窗 A 和 B，只在 B 編輯。先關閉 B，再關閉 A：storage 裡保存的是 B 的內容。
10. 修改任一原始碼（讓 precache 內容改變）後，重新 build 並 preview：原本開著的頁面出現新版本提示，按 Reload 後內容沒有遺失。
11. build 之後，`dist/sw.js` 的 precache 清單包含 `index-*.js` 與 Caveat 的 `.woff2`，build log 沒有「will not be precached」警告。
12. `npm run lint`、`npm run build`、`npm test`、`npm run test:coverage`、`npm run test:e2e` 全部通過，§9.1 列出的模組覆蓋率都 ≥ 80%。
13. 部署到 Vercel 後：`/sw.js` 與 `/manifest.webmanifest` 的回應標頭是 `max-age=0`，並重複第 5、6 項。

驗收結束後，到 DevTools 註銷 `localhost:4173` 的 SW，避免之後在同一個 port 預覽其他專案時被舊快取干擾。

## 11. 文件更新

- **`CLAUDE.md`**：
  - Commands 加上 `npm run test:e2e`（PR 1）與 `npm test`（PR 2）。
  - Architecture 補充持久化（`src/persistence/`）與 PWA 的說明。
  - Deployment 補充 §6.4 的規則：不要 Instant Rollback 到 PWA 之前的部署；移除 PWA 時要先部署 `selfDestroying`。
- **`README.md`**：功能列表加上「可安裝、可離線使用」、「自動儲存」。

## 12. 審閱紀錄（2026-09-13）

| # | 風險 | 嚴重度 | 修正位置 |
| --- | --- | --- | --- |
| 1 | 還原後 node id 撞號：`nodeIdCounter` 重新整理後歸零，新 node 與還原的 node 同 id | 高 | §5.4、§5.5、§9.4 |
| 2 | undo/redo 的結果不回報，存檔停在 undo 前的內容 | 高 | §1、§5.5、§9.3 |
| 3 | 沒編輯過的舊視窗在 `pagehide` 時整份覆寫，蓋掉其他視窗的修改 | 高 | §4、§5.3、§10 |
| 4 | 按 Later 的舊版視窗讀到新版 `version`，當成損壞並覆寫資料 | 高 | §5.2、§5.4、§10 |
| 5 | 按 Reload 時如果 flush 失敗或 storage 不可用，reload 會清掉還沒存的內容 | 高 | §6.3、§9.4 |
| 6 | theme 直接存取 localStorage，storage 被封鎖時整頁空白，`unavailable` 降級走不到 | 高 | §5.6、§9.3 |
| 7 | Instant Rollback 到 PWA 之前的部署會讓使用者卡在舊版；移除 PWA 需要 self-destroying SW；舊版前端需要 API 相容 | 中 | §6.4、§11 |
| 8 | 備份損壞資料時如果容量不足，空白 workspace 仍會覆寫原始資料 | 中 | §5.4、§7 |
| 9 | `saveCurrentCanvasState` 沒有檢查 snapshot 的 tabId；`closeTab` 在 updater 裡有副作用 | 中 | §5.3 |
| 10 | Safari 安裝版 App 與瀏覽器分頁不共用 storage；原文對私密模式的描述不正確 | 中 | §7、§8、§13 |
| 11 | chunk 超過 2 MiB 時 Workbox 只警告並略過，離線會失效 | 中 | §6.1、§10 |
| 12 | vitest 預設會執行 Playwright 的 `*.spec.ts`；測試檔會被 `tsc -b` 型別檢查；zod 沒有列入依賴、版本未指定 | 中 | §6.2、§9.1 |
| 13 | 缺少既有網頁行為的回歸防護 | 中 | §2、§9.2、§9.3 |
| 14 | 離線時保留的分析結果可能過期；假在線時仍顯示後端錯誤 | 低 | §5.5、§8 |
| 15 | params schema 與 `SystemParams` 可能不同步 | 低 | §5.2 |
| 16 | 固定的 theme-color 與 5 個主題不符；manifest 缺少 `id` | 低 | §5.6、§6.1 |
| 17 | 瀏覽器空間不足時可能清除 localStorage | 低 | §5.4 |
| 18 | 風險最高的 `useCanvasTabs` 不在覆蓋率門檻內 | 低 | §9.1 |

## 13. 待決事項（2026-09-13 已決定）

1. **Safari 安裝版 App 讀不到分頁裡的資料**：**決定不做匯出／匯入。** 接受 Safari 使用者安裝之後看到空白畫布、無法搬移資料的限制（§3、§8）。
2. **「手機版畫面」的範圍**：**決定這份 spec 不調整版面，之後另寫 responsive spec。** 屆時沿用 §9.2 的回歸測試保護桌面版。
3. ~~**Vercel 的 Node 版本**~~：已確認不影響部署。Vercel 的 build 不跑測試，版本不符只會出現警告（§9.1）。不需要決定。

## 14. 實作分期

| PR | 分支 | 內容 | 完成條件 |
| --- | --- | --- | --- |
| PR 1 | `test/e2e-regression-baseline`，從 `main`（`ecaebc2`）開出 | 本 spec；§9.2 的 Playwright 回歸測試與截圖基準，只含 `desktop-chromium-no-sw` 與 `desktop-webkit` 兩個 project；§9.1 標為 PR 1 的設定；`CLAUDE.md` 加上 `npm run test:e2e` | 不修改 `src/`；`npm run lint`、`npm run build`、`npm run test:e2e` 全部通過 |
| PR 2 | `feat/pwa-persistence`，從 PR 1 的分支開出，PR 1 merge 後 rebase 到 `main` | §5～§7 的實作；§9.1 其餘測試基礎設施；§9.3、§9.4 的測試；加入 `desktop-chromium-sw` project；§11 其餘文件 | §10 全部通過 |

- 每個 PR 各寫一份實作計畫，放在 `docs/superpowers/plans/`。
- PR 1 審閱時如果修改了回歸測試，PR 2 rebase 之後要重新跑一次 §9.2。
