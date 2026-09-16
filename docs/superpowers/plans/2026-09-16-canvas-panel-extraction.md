# Canvas 面板抽取 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `Canvas.tsx` 裡的工具列、警告面板、屬性面板抽成三個獨立元件，行為完全不變。

**Architecture:** 三次純搬移。每次把一段 JSX 移到新檔案，原本引用的 Canvas 區域變數改為同名 props，呼叫端保留原有的條件判斷。不新增包裹元素，DOM 結構與 class 完全不變，因此截圖基準必須逐張相符。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、@xyflow/react、Playwright 1.63、Vitest 5

**Spec:** `docs/superpowers/specs/2026-09-16-mobile-responsive-design.md`（本計畫實作 §12 的 PR 1，檔案清單見 §6.2）

## Global Constraints

- **零行為變更**：不得修改任何 e2e 測試、快照或截圖基準。既有測試就是這次重構的唯一驗收標準。
- **DOM 結構不變**：新元件回傳的 JSX 與原本逐字相同，不可加 Fragment、包裹 `<div>`、改動 `style` 物件或屬性順序。
- **props 沿用原名**：被抽出的區塊引用什麼名字，props 就叫什麼名字，JSX 內部不需要任何改寫。
- **測試數量**：桌面 e2e 維持 `178 passed / 1 skipped`（跳過的是 WebKit 連線測試）；`npm test` 維持 `81 passed`；不新增單元測試。
- **lint**：`npm run lint 2>&1 | grep "✖"` 必須輸出 `✖ 9 problems (2 errors, 7 warnings)`。`eslint-plugin-react-hooks` 7.0.1 啟用 React Compiler 規則（`refs`、`set-state-in-effect`、`purity`、`immutability`、`preserve-manual-memoization`），不可停用任何規則。
- **檔案大小**：新檔案各自 ≤ 400 行。
- **樣式寫法**：維持 inline style，本次不引入 CSS class。
- **Playwright 執行方式**：只透過 runner，加 `--reporter=line --global-timeout=900000`；執行前 `lsof -iTCP:4173 -sTCP:LISTEN -n -P` 必須沒有輸出；不可用 `--update-snapshots`。
- **環境**：8080 由 OrbStack 占用，不可動；不可終止 `playwright-mcp` 程序。
- **Commit**：格式 `<type>: <description>`，不加 `Co-Authored-By`；不 push。

---

## File Structure

| 檔案 | 責任 | 預估行數 |
| --- | --- | --- |
| `frontend/src/components/PropertyDock.tsx`（新增） | 右側屬性面板容器：寬度拖曳把手、關閉鈕、兩個屬性面板 | 約 140 |
| `frontend/src/components/WarningsPanel.tsx`（新增） | 下方警告面板：高度拖曳把手、警告列表、忽略與定位 | 約 230 |
| `frontend/src/components/CanvasToolbar.tsx`（新增） | 上方工具列：Merge/Split、離線提示、分析摘要、Demo 下拉、設定選單 | 約 170 |
| `frontend/src/components/Canvas.tsx`（修改） | 保留狀態與邏輯，三處 JSX 換成元件呼叫 | 1809 → 約 1450 |

抽取順序由下而上（PropertyDock → WarningsPanel → CanvasToolbar），因為抽走後面的區塊不會改變前面的行號，反之會。**每個 task 開始前，務必用內容而非行號再次確認區塊邊界。**

`Theme` 型別從既有的 `src/theme/themePreference.ts` 匯入，不要在新檔案重新宣告字面聯集。

---

### Task 1: PropertyDock

**Files:**
- Create: `frontend/src/components/PropertyDock.tsx`
- Modify: `frontend/src/components/Canvas.tsx:1710-1803`

**Interfaces:**
- Consumes：`ComponentPropertyPanel`、`EdgePropertyPanel`（既有元件，prop 型別直接沿用）
- Produces：`<PropertyDock propertyPanelWidth setPropertyPanelWidth setShowPropertyPanel isDraggingRef selectedNode selectedEdgeId edges onNodeDataChange onEdgeDataChange onEdgeAnimatedChange onEdgeDirectionChange onEdgeReverse />`

- [ ] **Step 1: 確認起點乾淨**

```bash
cd /Users/june/Projects/ArchitectMind/frontend
git -C .. status --short
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npx playwright test --reporter=line --global-timeout=900000
```

Expected：`git status` 沒有輸出；`lsof` 沒有輸出；e2e `178 passed`、`1 skipped`。這是後面每一步的比較基準。

- [ ] **Step 2: 確認區塊邊界**

```bash
sed -n '1710,1711p;1802,1803p' src/components/Canvas.tsx
```

Expected：1710 是 `{showPropertyPanel && (`、1711 是 `<div style={{ position: 'relative' }}>`、1802 是 `</div>`、1803 是 `)}`。若不符，用 `grep -n "showPropertyPanel && (" src/components/Canvas.tsx` 重新定位，並以該行為準。

- [ ] **Step 3: 建立 `PropertyDock.tsx`**

檔案骨架如下。`JSX` 的位置貼上 `Canvas.tsx` 第 1711–1802 行（不含 1710 的 `{showPropertyPanel && (` 與 1803 的 `)}`），**一個字都不要改**：縮排可整體左移，但屬性順序、style 物件、空白與註解都要保留。

```tsx
import type { ComponentProps, Dispatch, RefObject, SetStateAction } from 'react'
import ComponentPropertyPanel from './ComponentPropertyPanel'
import EdgePropertyPanel from './EdgePropertyPanel'

type ComponentPanelProps = ComponentProps<typeof ComponentPropertyPanel>
type EdgePanelProps = ComponentProps<typeof EdgePropertyPanel>

interface PropertyDockProps {
  propertyPanelWidth: number
  setPropertyPanelWidth: Dispatch<SetStateAction<number>>
  setShowPropertyPanel: Dispatch<SetStateAction<boolean>>
  isDraggingRef: RefObject<boolean>
  selectedNode: ComponentPanelProps['selectedNode']
  selectedEdgeId: ComponentPanelProps['selectedEdgeId']
  edges: EdgePanelProps['edges']
  onNodeDataChange: ComponentPanelProps['onNodeDataChange']
  onEdgeDataChange: EdgePanelProps['onEdgeDataChange']
  onEdgeAnimatedChange: EdgePanelProps['onEdgeAnimatedChange']
  onEdgeDirectionChange: EdgePanelProps['onEdgeDirectionChange']
  onEdgeReverse: EdgePanelProps['onEdgeReverse']
}

function PropertyDock({
  propertyPanelWidth,
  setPropertyPanelWidth,
  setShowPropertyPanel,
  isDraggingRef,
  selectedNode,
  selectedEdgeId,
  edges,
  onNodeDataChange,
  onEdgeDataChange,
  onEdgeAnimatedChange,
  onEdgeDirectionChange,
  onEdgeReverse,
}: PropertyDockProps) {
  return (
    JSX
  )
}

export default PropertyDock
```

`isDraggingRef` 的型別以 `tsc -b` 為準：若編譯器要求 `RefObject<boolean>` 以外的形式（例如 `MutableRefObject<boolean>`），改用它報的型別，並在報告中記錄。

- [ ] **Step 4: 替換 `Canvas.tsx` 的區塊**

把第 1710–1803 行整段換成：

```tsx
        {showPropertyPanel && (
          <PropertyDock
            propertyPanelWidth={propertyPanelWidth}
            setPropertyPanelWidth={setPropertyPanelWidth}
            setShowPropertyPanel={setShowPropertyPanel}
            isDraggingRef={isDraggingRef}
            selectedNode={selectedNode}
            selectedEdgeId={selectedEdgeId}
            edges={edges}
            onNodeDataChange={onNodeDataChange}
            onEdgeDataChange={onEdgeDataChange}
            onEdgeAnimatedChange={onEdgeAnimatedChange}
            onEdgeDirectionChange={onEdgeDirectionChange}
            onEdgeReverse={onEdgeReverse}
          />
        )}
```

並在 import 區塊（第 20–24 行附近，`ComponentPropertyPanel` 的 import 旁）加上：

```tsx
import PropertyDock from './PropertyDock'
```

`ComponentPropertyPanel` 與 `EdgePropertyPanel` 的 import 若已無其他使用者，`tsc -b` 會報未使用而失敗；此時把這兩行從 `Canvas.tsx` 移除。用 `grep -n "ComponentPropertyPanel\|EdgePropertyPanel" src/components/Canvas.tsx` 確認。

- [ ] **Step 5: 型別與行為驗證**

```bash
npm run build
npx eslint src/components/PropertyDock.tsx src/components/Canvas.tsx
npm run lint 2>&1 | grep "✖"
npm test 2>&1 | grep -E "Test Files|Tests  "
```

Expected：build 成功；eslint 沒有輸出；lint 是 `✖ 9 problems (2 errors, 7 warnings)`；`81 passed`。

- [ ] **Step 6: 完整回歸測試**

```bash
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npx playwright test --reporter=line --global-timeout=900000
```

Expected：`178 passed`、`1 skipped`，0 failed。截圖比對必須全過——若有任何一張截圖失敗，代表搬移改動了 DOM 或樣式，**不可執行 `--update-snapshots`**，回到 Step 3 逐字比對差異。

- [ ] **Step 7: Commit**

```bash
git -C .. add frontend/src/components/PropertyDock.tsx frontend/src/components/Canvas.tsx
git -C .. commit -m "refactor: extract PropertyDock from Canvas"
```

---

### Task 2: WarningsPanel

**Files:**
- Create: `frontend/src/components/WarningsPanel.tsx`
- Modify: `frontend/src/components/Canvas.tsx:1518-1708`

**Interfaces:**
- Consumes：`Warning`、`AnalyzeResponse`（`../types/topology`）
- Produces：`<WarningsPanel panelHeight onDragStart analysisResult activeWarnings dismissedWarnings setDismissedWarnings setShowWarnings showPropertyPanel fitViewToNode tooltipBg tooltipHover />`

- [ ] **Step 1: 確認區塊邊界**

```bash
grep -n "Warning Panel terminal style" src/components/Canvas.tsx
grep -n "showWarnings && activeWarnings.length > 0 && (" src/components/Canvas.tsx
```

Expected：註解在 1518 行附近、條件在下一行。Task 1 抽走的是更後面的程式碼，所以這兩個行號不會變動。以 grep 結果為準，區塊從條件式的 `(` 之後開始，到對應的 `)}` 之前結束。

- [ ] **Step 2: 建立 `WarningsPanel.tsx`**

`JSX` 貼上條件式內部那一整段（原 1520–1707 行），逐字不改：

```tsx
import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import type { AnalyzeResponse, Warning } from '../types/topology'

interface WarningsPanelProps {
  panelHeight: number
  onDragStart: (e: MouseEvent) => void
  analysisResult: AnalyzeResponse | null
  activeWarnings: Warning[]
  dismissedWarnings: Set<number>
  setDismissedWarnings: Dispatch<SetStateAction<Set<number>>>
  setShowWarnings: Dispatch<SetStateAction<boolean>>
  showPropertyPanel: boolean
  fitViewToNode: (nodeId: string) => void
  tooltipBg: string
  tooltipHover: string
}

function WarningsPanel({
  panelHeight,
  onDragStart,
  analysisResult,
  activeWarnings,
  dismissedWarnings,
  setDismissedWarnings,
  setShowWarnings,
  showPropertyPanel,
  fitViewToNode,
  tooltipBg,
  tooltipHover,
}: WarningsPanelProps) {
  return (
    JSX
  )
}

export default WarningsPanel
```

`onDragStart` 是面板高度的拖曳把手，型別取自 `Canvas.tsx:130` 的 `(e: React.MouseEvent) => void`，名稱保持不變，JSX 內部才不用改。

- [ ] **Step 3: 替換 `Canvas.tsx` 的區塊**

保留原本的註解與條件式，內容換成元件呼叫：

```tsx
          {/* Warning Panel terminal style */}
          {showWarnings && activeWarnings.length > 0 && (
            <WarningsPanel
              panelHeight={panelHeight}
              onDragStart={onDragStart}
              analysisResult={analysisResult}
              activeWarnings={activeWarnings}
              dismissedWarnings={dismissedWarnings}
              setDismissedWarnings={setDismissedWarnings}
              setShowWarnings={setShowWarnings}
              showPropertyPanel={showPropertyPanel}
              fitViewToNode={fitViewToNode}
              tooltipBg={tooltipBg}
              tooltipHover={tooltipHover}
            />
          )}
```

import 加上：

```tsx
import WarningsPanel from './WarningsPanel'
```

- [ ] **Step 4: 型別與行為驗證**

```bash
npm run build
npx eslint src/components/WarningsPanel.tsx src/components/Canvas.tsx
npm run lint 2>&1 | grep "✖"
npm test 2>&1 | grep -E "Test Files|Tests  "
```

Expected：build 成功；eslint 沒有輸出；`✖ 9 problems (2 errors, 7 warnings)`；`81 passed`。

- [ ] **Step 5: 完整回歸測試**

```bash
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npx playwright test --reporter=line --global-timeout=900000
```

Expected：`178 passed`、`1 skipped`。`analysis.spec.ts` 裡的警告相關測試與截圖是這一段的主要保護，任何失敗都代表搬移不精確。

- [ ] **Step 6: Commit**

```bash
git -C .. add frontend/src/components/WarningsPanel.tsx frontend/src/components/Canvas.tsx
git -C .. commit -m "refactor: extract WarningsPanel from Canvas"
```

---

### Task 3: CanvasToolbar

**Files:**
- Create: `frontend/src/components/CanvasToolbar.tsx`
- Modify: `frontend/src/components/Canvas.tsx:1246-1374`

**Interfaces:**
- Consumes：`ToolbarButton`、`SettingsMenu`（既有元件）；`Theme`（`../theme/themePreference`）
- Produces：`<CanvasToolbar theme setTheme nodes edges canMerge canSplit mergeSelectedNodes splitSelectedNode isOnline persistenceHealthy analysisResult activeWarnings setShowWarnings showPresets setShowPresets presetsRef handleDemo handleTwitter handleYouTube handleGoogle />`

- [ ] **Step 1: 確認區塊邊界**

```bash
grep -n "padding: '8px 16px'" src/components/Canvas.tsx
sed -n '1244,1247p' src/components/Canvas.tsx
```

Expected：1244 是 `return (`、1245 是外層 `<div style={{ display: 'flex', flexDirection: 'column', flex: 1, ...`（**保留在 Canvas**）、1246 是工具列的 `<div`。工具列結束於 `<SettingsMenu ... />` 之後的 `</div>`（原 1374 行）。

- [ ] **Step 2: 建立 `CanvasToolbar.tsx`**

`JSX` 貼上原 1246–1374 行，逐字不改：

```tsx
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { AnalyzeResponse, Warning } from '../types/topology'
import type { Theme } from '../theme/themePreference'
import ToolbarButton from './ToolbarButton'
import SettingsMenu from './SettingsMenu'

interface CanvasToolbarProps {
  theme: Theme
  setTheme: (theme: Theme) => void
  nodes: Node[]
  edges: Edge[]
  canMerge: boolean
  canSplit: boolean
  mergeSelectedNodes: () => void
  splitSelectedNode: () => void
  isOnline: boolean
  persistenceHealthy: boolean
  analysisResult: AnalyzeResponse | null
  activeWarnings: Warning[]
  setShowWarnings: Dispatch<SetStateAction<boolean>>
  showPresets: boolean
  setShowPresets: Dispatch<SetStateAction<boolean>>
  presetsRef: RefObject<HTMLDivElement | null>
  handleDemo: () => void
  handleTwitter: () => void
  handleYouTube: () => void
  handleGoogle: () => void
}

function CanvasToolbar({
  theme,
  setTheme,
  nodes,
  edges,
  canMerge,
  canSplit,
  mergeSelectedNodes,
  splitSelectedNode,
  isOnline,
  persistenceHealthy,
  analysisResult,
  activeWarnings,
  setShowWarnings,
  showPresets,
  setShowPresets,
  presetsRef,
  handleDemo,
  handleTwitter,
  handleYouTube,
  handleGoogle,
}: CanvasToolbarProps) {
  return (
    JSX
  )
}

export default CanvasToolbar
```

`presetsRef` 的型別以 `tsc -b` 為準；React 19 的 `useRef<HTMLDivElement>(null)` 對應 `RefObject<HTMLDivElement | null>`，若編譯器另有要求就照它報的改，並記錄在報告中。

- [ ] **Step 3: 替換 `Canvas.tsx` 的區塊**

第 1246–1374 行整段換成：

```tsx
      <CanvasToolbar
        theme={theme}
        setTheme={setTheme}
        nodes={nodes}
        edges={edges}
        canMerge={canMerge}
        canSplit={Boolean(canSplit)}
        mergeSelectedNodes={mergeSelectedNodes}
        splitSelectedNode={splitSelectedNode}
        isOnline={isOnline}
        persistenceHealthy={persistenceHealthy}
        analysisResult={analysisResult}
        activeWarnings={activeWarnings}
        setShowWarnings={setShowWarnings}
        showPresets={showPresets}
        setShowPresets={setShowPresets}
        presetsRef={presetsRef}
        handleDemo={handleDemo}
        handleTwitter={handleTwitter}
        handleYouTube={handleYouTube}
        handleGoogle={handleGoogle}
      />
```

`canSplit` 在 `Canvas.tsx:433` 的型別是 `boolean | undefined`（來自 `selectedNodeForSplitData && ...`），所以呼叫端用 `Boolean(canSplit)` 收斂。`{undefined && ...}` 與 `{false && ...}` 的渲染結果相同，行為不變。

import 加上：

```tsx
import CanvasToolbar from './CanvasToolbar'
```

`ToolbarButton` 與 `SettingsMenu` 若在 `Canvas.tsx` 已無其他使用者，移除它們的 import。用 grep 確認。

- [ ] **Step 4: 型別與行為驗證**

```bash
npm run build
npx eslint src/components/CanvasToolbar.tsx src/components/Canvas.tsx
npm run lint 2>&1 | grep "✖"
npm test 2>&1 | grep -E "Test Files|Tests  "
wc -l src/components/Canvas.tsx src/components/CanvasToolbar.tsx src/components/WarningsPanel.tsx src/components/PropertyDock.tsx
```

Expected：build 成功；eslint 沒有輸出；`✖ 9 problems (2 errors, 7 warnings)`；`81 passed`；三個新檔案各自 ≤ 400 行，`Canvas.tsx` 約 1420 行。

- [ ] **Step 5: 完整回歸測試與截圖確認**

```bash
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npx playwright test --reporter=line --global-timeout=900000
git -C .. status --short -- frontend/e2e
```

Expected：`178 passed`、`1 skipped`；最後一個指令沒有輸出，證明沒有任何測試檔或截圖被改動。

- [ ] **Step 6: Commit**

```bash
git -C .. add frontend/src/components/CanvasToolbar.tsx frontend/src/components/Canvas.tsx
git -C .. commit -m "refactor: extract CanvasToolbar from Canvas"
```

---

## 完成後的狀態

- `Canvas.tsx` 從 1809 行降到約 1450 行：抽走約 414 行 JSX，加回約 55 行的元件呼叫與 import。spec §6.2 寫的「約 1200 行」是設計階段的粗估，實際以這裡的數字為準。
- 三個新元件都是純呈現層，狀態仍然全部留在 `Canvas.tsx`，PR 2 只需要在它們內部加手機分支。
- 桌面 e2e、截圖基準、單元測試、lint 全部與 PR 1 開始前相同。
