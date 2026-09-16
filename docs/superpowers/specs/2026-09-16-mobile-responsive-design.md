# 手機版與響應式版面設計

## 1. 目標

讓 ArchitectMind 在手機上可用：安裝成 PWA 之後，能瀏覽既有設計，並完成基本編輯（加入元件、移動、改屬性、刪除、連線）。桌面版行為完全不變。

這份 spec 承接 `2026-09-13-pwa-canvas-persistence-design.md` §13 的決定：當時刻意把版面工作延後，另寫 responsive 規格。

## 2. 現況與問題

| 事實 | 位置 | 影響 |
| --- | --- | --- |
| 加入元件靠 HTML5 拖放 | `Sidebar.tsx:37` `draggable`／`Canvas.tsx:765` `onDrop` | 觸控不會觸發這組事件，手機無法加入任何元件 |
| 編輯操作綁鍵盤 | `Canvas.tsx:868-903`（Ctrl+A/C/V/Z、Ctrl+M、Backspace） | 手機沒有鍵盤，刪除與復原等於消失 |
| `panOnDrag={false}` + `selectionOnDrag` | `Canvas.tsx:1433-1434` | 單指拖曳是框選，手機無法平移畫布 |
| 版面寬度寫死 | 側邊欄 168、屬性面板 300、警告面板高 250 | 內容區至少需 640px，手機（393px）擠爆 |
| 連接點是預設樣式 | `ArchitectureNode.tsx:283-290` | 約 6–8px，手指點不到 |
| 全專案沒有 `@media`、沒有 CSS class | `src/index.css` 只有 CSS 變數 | 版面完全由 inline style 決定 |

## 3. 決策

| 項目 | 決定 | 理由 |
| --- | --- | --- |
| 手機能做的事 | 基本編輯：加入、移動、改屬性、刪除、連線 | 進階操作（合併、分割、複製貼上、undo/redo、多選）依賴鍵盤或精確指標 |
| 版面數量 | 只做一個斷點，手機一套 | 平板橫放已能用桌面版；兩套版面的維護成本此刻沒有回報 |
| 實作方式 | JS 旗標 `useIsMobile()` + 底部面板 | 與現有 inline style 一致；`tap-to-add` 本來就需要 JS；e2e 好測 |
| 測試 | 新增 `mobile-chromium` 專案，功能測試 + 截圖基準 | 版面工作最容易壞在視覺上 |
| 桌面版 | 不改行為、不改截圖基準 | 既有 178 個 e2e 就是重構的驗證網 |

## 4. 斷點與版面

### 4.1 斷點

```ts
const MOBILE_QUERY = '(max-width: 767px), (orientation: landscape) and (max-height: 500px)'
```

第二個條件處理手機橫放：寬度變成 851px 會落在桌面版，但高度只有 393px，桌面版面同樣不能用。兩個條件以逗號相連，任一成立即為手機版。

768px 以上且高度足夠時，**所有程式路徑與現在完全相同**。

### 4.2 手機版各區塊

| 區塊 | 桌面 | 手機 |
| --- | --- | --- |
| 分頁列 | 上方 36px，可水平捲動 | 不變；側邊欄開關鈕隱藏 |
| 元件面板 | 左側固定 168px | 底部抽屜，13 個元件 3 欄排列，由工具列「＋」開啟 |
| 工具列 | Merge／Split／離線提示／分析摘要／Demo／設定 | 隱藏 Merge、Split；新增「＋」；其餘保留，放不下時水平捲動 |
| 屬性面板 | 右側 300px，可拖曳調寬 | 底部面板，高度 60vh，附關閉與刪除按鈕 |
| 警告面板 | 下方 250px，可拖曳調高 | 收合成一條摘要（`45/45` 與警告數），點開展成底部面板 |
| 儲存／離線提示 | 現有 Toast | 位置不變，`z-index` 需高於底部面板 |

同一時間只顯示一個底部面板。開啟元件抽屜會收起屬性面板，反之亦然。

### 4.3 觸控與安全區域

- 手機：`panOnDrag` 開啟、`selectionOnDrag` 關閉。桌面維持現值。
- `<Controls />` 保留；手機上按鈕最小 44×44。
- 連接點命中區在手機放大到 24×24（透明區域），圓點視覺不變。這是專案第一條 CSS 規則，寫在 `index.css`，用 `.react-flow.mobile .react-flow__handle` 限定範圍。
- `index.html` 的 viewport 加上 `viewport-fit=cover`，底部面板套用 `padding-bottom: env(safe-area-inset-bottom)`。

## 5. 觸控互動

### 5.1 加入元件

1. 點工具列「＋」開啟抽屜。
2. 點一個元件進入待放置狀態並高亮；再點同一個取消。
3. 點畫布任一位置放置元件，座標用 `rfInstance.screenToFlowPosition()`（與現有 `onDrop` 同一套換算）。
4. 放置後抽屜收起，新節點成為選取狀態，但**不自動開啟屬性面板**。

待放置狀態在以下情況清除：放置完成、再次點選同一元件、關閉抽屜、切換分頁。

一次放置一個元件。連續放置模式不做。

### 5.2 選取與編輯

- 點節點：屬性面板展開，內容為現有 `ComponentPropertyPanel`。
- 點邊線：同一面板改顯示現有 `EdgePropertyPanel`。
- 點空白處：取消選取，面板收起。
- 待放置狀態存在時，點畫布只放置元件，不改變選取。

### 5.3 刪除

屬性面板內新增刪除按鈕，走現有 `onNodesDelete` 路徑，連帶移除相接的邊線。**此按鈕只在手機顯示**，桌面維持鍵盤刪除，以免變動桌面截圖基準。

### 5.4 連線

拖曳連接點到目標節點，沿用 React Flow 既有機制，只放大命中區。

若實測發現準確度不足，備案是「選取節點 → 點連線 → 點目標節點」。此備案不在本次範圍，需要時另開。

### 5.5 手機不提供的操作

合併、分割、複製貼上、undo/redo、多選、Shift+拖曳複製。鍵盤監聽器維持註冊，不需特別移除。

## 6. 元件與檔案結構

### 6.1 新增

| 檔案 | 責任 |
| --- | --- |
| `src/hooks/useIsMobile.ts` | `useSyncExternalStore` 包 `matchMedia(MOBILE_QUERY)`，subscribe 與 getSnapshot 為模組層級函式 |
| `src/components/BottomSheet.tsx` | 底部面板外殼：展開收起、背景遮罩、safe-area 內距 |
| `src/components/ComponentDrawer.tsx` | 手機元件面板：3 欄排列、待放置狀態高亮 |

### 6.2 從 `Canvas.tsx` 抽出

| 檔案 | 現有位置 |
| --- | --- |
| `src/components/CanvasToolbar.tsx` | 1245–1374 行 |
| `src/components/WarningsPanel.tsx` | 1519–1710 行 |
| `src/components/PropertyDock.tsx` | 1711–1800 行 |

抽取是純搬移，不改行為。抽完 `Canvas.tsx` 約剩 1200 行。

### 6.3 修改

- `src/App.tsx`：手機時不渲染 `<Sidebar>`。
- `src/components/TabBar.tsx`：手機時隱藏側邊欄開關。
- `src/components/Canvas.tsx`：`panOnDrag`／`selectionOnDrag` 依旗標切換；新增待放置狀態與畫布點擊放置；渲染抽屜。
- `src/index.css`：連接點命中區規則。
- `frontend/index.html`：viewport 加 `viewport-fit=cover`。

### 6.4 狀態歸屬

待放置的元件型別（`pendingComponentType`）存在 `Canvas.tsx`，因為放置發生在畫布點擊。抽屜由 Canvas 渲染，`App.tsx` 不需傳遞新 props。

## 7. 邊界情況

| 情況 | 行為 |
| --- | --- |
| 旋轉螢幕跨越斷點 | `matchMedia` 事件觸發重繪；底部面板關閉，選取狀態保留 |
| 桌面視窗縮小到 767px 以下 | 立即切換手機版面；不重新掛載 Canvas，畫布內容與分頁不受影響 |
| 待放置狀態時切換分頁 | 狀態清除 |
| 屬性面板開啟時節點被刪除 | 選取清空，面板自動收起 |
| 底部面板與 Toast 重疊 | Toast 的 `z-index` 高於面板 |
| 抽屜開啟時點畫布 | 視為放置動作，不只是關閉抽屜 |

## 8. 測試

### 8.1 Playwright 專案

```ts
const MOBILE_SPEC = /mobile\.spec\.ts$/
const MOBILE_VISUAL_SPEC = /mobile-visual\.spec\.ts$/

{
  name: 'mobile-chromium',
  testMatch: [MOBILE_SPEC, MOBILE_VISUAL_SPEC],
  use: { ...devices['Pixel 5'], locale: 'en-US', colorScheme: 'light', serviceWorkers: 'block' },
}
```

三個桌面專案的 `testIgnore` 加入這兩個檔案，桌面測試數量維持不變。

### 8.2 功能測試 `e2e/mobile.spec.ts`

1. 手機版不渲染側邊欄，工具列出現「＋」。
2. 開抽屜 → 選元件 → 點畫布 → 節點出現、抽屜收起。
3. 再點同一元件可取消，之後點畫布不會放置。
4. 點節點 → 屬性面板展開；改 label 後畫布同步更新。
5. 刪除按鈕移除節點與相接的邊線。
6. 點空白處 → 取消選取、面板收起。
7. 分析摘要點開後看得到警告內容。
8. 手機看不到 Merge、Split。
9. 重新整理後畫布內容仍在。

### 8.3 截圖 `e2e/mobile-visual.spec.ts`

light 主題三張：空白畫布、Basic preset、元件抽屜開啟。手機版面不隨主題改變，配色已由桌面截圖覆蓋。

### 8.4 單元測試

`useIsMobile`（模擬 matchMedia 與斷點變化）、`BottomSheet`（展開收起、點遮罩關閉）、`ComponentDrawer`（選取與取消）。三個檔案加入 `vitest.config.ts` 的 `coverage.include`。

### 8.5 不自動化

兩項列入人工驗收，不寫自動化測試：

- **單指拖曳平移**：Playwright 沒有現成的滑動手勢 API，硬做容易變成假通過。改以 `<Controls>` 縮放按鈕驗證畫布可操作。
- **手機橫放**：§4.1 的第二個斷點條件（`orientation: landscape` 且高度 ≤ 500px）只在真機與瀏覽器模擬器驗證。`mobile-chromium` 專案固定直式，避免同一組測試跑兩種方向而使基準難以維護。

## 9. 驗收條件

1. 桌面三個專案的測試數量與截圖基準完全不變。
2. 抽取重構完成後，桌面 e2e 維持 178 passed / 1 skipped（跳過的是 WebKit 的連線測試）。
3. `mobile-chromium` 專案 12 個測試全過（9 功能 + 3 截圖）。
4. 單元測試與覆蓋率門檻通過。
5. `npm run lint` 不超過 `main` 既有的錯誤數。
6. 手機上可完成：加入元件、移動、改屬性、刪除、連線。
7. 人工驗收：真機（iPhone Safari、Android Chrome）安裝後測試上述操作、雙指縮放、單指平移，並確認底部面板未被 home indicator 遮住。

## 10. 文件

- `CLAUDE.md`：新增手機版面說明與 `mobile-chromium` 測試專案；註明手機版隱藏哪些操作。
- `README.md`：功能清單加入手機可用的說明。

## 11. 不在範圍

- 平板專屬版面。
- 手機上的合併、分割、複製貼上、undo/redo、多選。
- 連線的備案流程（選取 → 連線 → 點目標）。
- 匯出功能的手機版調整。
- 深色主題的手機截圖基準。

## 12. 實作順序

拆成兩個 PR：

**PR 1：抽取重構**
`CanvasToolbar`、`WarningsPanel`、`PropertyDock` 從 `Canvas.tsx` 抽出，純搬移零行為變更。驗證標準是桌面 178 個 e2e 與截圖基準全綠。

**PR 2：手機版**
`useIsMobile`、`BottomSheet`、`ComponentDrawer`、觸控設定、`mobile-chromium` 專案與測試、文件。

分開的理由：抽取是大範圍搬移但風險可由既有測試完全覆蓋；手機版是新行為需要新測試。混在一起時，review 無法分辨某個差異是搬移還是新功能。
