# 手機版版面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 767px 以下的螢幕提供可用的手機版面與觸控操作，桌面版行為完全不變。

**Architecture:** 一個 `useIsMobile()` 旗標決定版面。手機上側邊欄與右側屬性面板改成底部面板，元件改用「點選再點畫布放置」取代 HTML5 拖放，單指拖曳改為平移。所有分支都寫在 PR 1 抽出的小元件內，`Canvas.tsx` 只增加待放置狀態與畫布點擊處理。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、@xyflow/react、Playwright 1.63、Vitest 5、@testing-library/react 16

**Spec:** `docs/superpowers/specs/2026-09-16-mobile-responsive-design.md`（本計畫實作 §12 的 PR 2）

## Global Constraints

- **桌面版不得改變**：768px 以上的渲染與行為完全不變。桌面三個 Playwright 專案維持 `178 passed / 1 skipped`，截圖基準不得更新或刪除。
- **斷點**：`(max-width: 767px), (orientation: landscape) and (max-height: 500px)`，逐字使用，定義在 `useIsMobile.ts` 並由測試斷言。
- **UI 文案**：一律使用 spec 的英文原文，逐字照抄。
- **不可放寬斷言**：不可刪斷言、不可加 retries、不可用 `--update-snapshots`、不可調高 `maxDiffPixelRatio`。
- **lint**：`npm run lint 2>&1 | grep "✖"` 必須輸出 `✖ 9 problems (2 errors, 7 warnings)`（`main` 既有的 `Sidebar.tsx` 2 錯誤與 `Canvas.tsx` 7 警告）。每個新檔案 `npx eslint <file>` 必須零輸出。不可停用任何規則；`eslint-plugin-react-hooks` 7.0.1 的 React Compiler 規則（`refs`、`set-state-in-effect`、`purity`、`immutability`、`preserve-manual-memoization`）全部啟用。
- **覆蓋率 80%**：新增的 `src/hooks/useIsMobile.ts`、`src/components/BottomSheet.tsx`、`src/components/ComponentDrawer.tsx` 都要加進 `vitest.config.ts` 的 `coverage.include`。
- **程式風格**：不可變（不修改參數、不對陣列 `push`）、不 `console.log`、維持 inline style、檔案 ≤ 400 行、函式 < 50 行。
- **Playwright 執行方式**：只透過 runner，加 `--reporter=line --global-timeout=900000`。執行前 `lsof -iTCP:4173 -sTCP:LISTEN -n -P` 必須沒有輸出；若有程序占用，那是使用者的 preview，**不可終止**，停下來回報 BLOCKED。
- **環境**：8080 由 OrbStack 占用，不可動；不可終止 `playwright-mcp` 程序；`.superpowers/` 是 git-ignored 暫存，永遠不要 `git add`。
- **Commit**：格式 `<type>: <description>`，不加 `Co-Authored-By`；不 push。

---

## 起點

分支 `feat/mobile-responsive`，HEAD `5971099`。PR 1 已把三個面板抽成獨立元件：

| 檔案 | 行數 | 角色 |
| --- | --- | --- |
| `Canvas.tsx` | 1447 | 狀態與邏輯全部留在這裡 |
| `WarningsPanel.tsx` | 221 | 下方警告面板，props 由 Canvas 傳入 |
| `CanvasToolbar.tsx` | 186 | 上方工具列 |
| `PropertyDock.tsx` | 132 | 右側屬性面板 |

基準：`npm test` 81 passed、桌面 e2e 178 passed / 1 skipped、lint `✖ 9 problems (2 errors, 7 warnings)`。

## File Structure

| 檔案 | 動作 | 責任 |
| --- | --- | --- |
| `frontend/src/hooks/useIsMobile.ts` | 新增 | 斷點旗標，`useSyncExternalStore` 包 `matchMedia` |
| `frontend/src/hooks/useIsMobile.test.ts` | 新增 | 5 個測試 |
| `frontend/src/components/BottomSheet.tsx` | 新增 | 底部面板外殼：遮罩、標題列、關閉鈕、safe-area |
| `frontend/src/components/BottomSheet.test.tsx` | 新增 | 4 個測試 |
| `frontend/src/components/ComponentDrawer.tsx` | 新增 | 手機元件面板，3 欄排列、待放置高亮 |
| `frontend/src/components/ComponentDrawer.test.tsx` | 新增 | 4 個測試 |
| `frontend/src/components/Canvas.tsx` | 修改 | 待放置狀態、`onPaneClick` 放置、`panOnDrag`／`selectionOnDrag` 切換、渲染抽屜 |
| `frontend/src/components/CanvasToolbar.tsx` | 修改 | 手機時顯示「＋」、隱藏 Merge/Split |
| `frontend/src/components/PropertyDock.tsx` | 修改 | 手機時改用 `BottomSheet` |
| `frontend/src/components/WarningsPanel.tsx` | 修改 | 手機時改用 `BottomSheet` |
| `frontend/src/App.tsx` | 修改 | 手機時不渲染 `<Sidebar>` |
| `frontend/src/components/TabBar.tsx` | 修改 | 手機時隱藏側邊欄開關 |
| `frontend/src/index.css` | 修改 | 連接點命中區放大（附加在檔尾） |
| `frontend/index.html` | 修改 | viewport 加 `viewport-fit=cover` |
| `frontend/vitest.config.ts` | 修改 | `coverage.include` 加三個新檔 |
| `frontend/playwright.config.ts` | 修改 | 新增 `mobile-chromium` 專案，桌面專案 ignore 手機測試 |
| `frontend/e2e/mobile.spec.ts` | 新增 | 9 個功能測試 |
| `frontend/e2e/mobile-visual.spec.ts` | 新增 | 3 張截圖 |
| `CLAUDE.md`、`README.md` | 修改 | spec §10 的文件更新 |

**單元測試數量**：81 → Task 1 後 86 → Task 2 後 90 → Task 3 後 94，之後不再增加。

**e2e 數量**：178 passed / 1 skipped → Task 6 後 187 / 1 → Task 7 後 190 / 1。

---

### Task 1: `useIsMobile`

**Files:**
- Create: `frontend/src/hooks/useIsMobile.ts`、`frontend/src/hooks/useIsMobile.test.ts`
- Modify: `frontend/vitest.config.ts`

**Interfaces:**
- Consumes：無
- Produces：`MOBILE_QUERY: string`、`useIsMobile(): boolean`

- [ ] **Step 1: 先寫測試 `src/hooks/useIsMobile.test.ts`**

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOBILE_QUERY, useIsMobile } from './useIsMobile'

type Listener = () => void

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>()
  let matches = initial
  const queries: string[] = []
  vi.stubGlobal(
    'matchMedia',
    (query: string) => {
      queries.push(query)
      return {
        media: query,
        get matches() {
          return matches
        },
        addEventListener: (_type: 'change', listener: Listener) => {
          listeners.add(listener)
        },
        removeEventListener: (_type: 'change', listener: Listener) => {
          listeners.delete(listener)
        },
      }
    }
  )
  return {
    queries,
    listenerCount: () => listeners.size,
    setMatches(next: boolean) {
      matches = next
      listeners.forEach((listener) => listener())
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useIsMobile', () => {
  it('uses the breakpoint from the spec, including landscape phones', () => {
    expect(MOBILE_QUERY).toBe('(max-width: 767px), (orientation: landscape) and (max-height: 500px)')
  })

  it('returns false on a desktop viewport', () => {
    const media = stubMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
    expect(media.queries).toContain(MOBILE_QUERY)
  })

  it('returns true when the query matches', () => {
    stubMatchMedia(true)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('re-renders when the viewport crosses the breakpoint', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())

    act(() => media.setMatches(true))

    expect(result.current).toBe(true)
  })

  it('removes its listener on unmount', () => {
    const media = stubMatchMedia(true)
    const { unmount } = renderHook(() => useIsMobile())
    expect(media.listenerCount()).toBe(1)

    unmount()

    expect(media.listenerCount()).toBe(0)
  })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npx vitest run src/hooks/useIsMobile.test.ts`
Expected: FAIL，找不到 `./useIsMobile`。

- [ ] **Step 3: 實作 `src/hooks/useIsMobile.ts`**

寫法刻意與既有的 `src/hooks/useOnlineStatus.ts` 一致：`subscribe` 與 `getSnapshot` 都是模組層級函式，`useSyncExternalStore` 才不會每次 render 重新訂閱。

```ts
import { useSyncExternalStore } from 'react'

// Spec §4.1: the second clause catches landscape phones, whose width exceeds
// the breakpoint while the height is far too small for the desktop layout.
export const MOBILE_QUERY = '(max-width: 767px), (orientation: landscape) and (max-height: 500px)'

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getSnapshot = (): boolean => window.matchMedia(MOBILE_QUERY).matches
const getServerSnapshot = (): boolean => false

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

- [ ] **Step 4: 確認測試通過**

Run: `npx vitest run src/hooks/useIsMobile.test.ts`
Expected: `5 passed`

- [ ] **Step 5: 加進覆蓋率清單**

`vitest.config.ts` 的 `coverage.include` 陣列，在 `'src/hooks/useOnlineStatus.ts',` 下面加一行：

```ts
        'src/hooks/useIsMobile.ts',
```

- [ ] **Step 6: 驗證**

```bash
npm run build
npx eslint src/hooks/useIsMobile.ts src/hooks/useIsMobile.test.ts
npm run lint 2>&1 | grep "✖"
npm test
npm run test:coverage
```

Expected：build 成功；eslint 沒有輸出；lint 是 `✖ 9 problems (2 errors, 7 warnings)`；`npm test` 86 passed；覆蓋率沒有 threshold 錯誤。

- [ ] **Step 7: Commit**

```bash
git -C .. add frontend/src/hooks/useIsMobile.ts frontend/src/hooks/useIsMobile.test.ts frontend/vitest.config.ts
git -C .. commit -m "feat: add mobile breakpoint hook"
```

---

### Task 2: `BottomSheet`

**Files:**
- Create: `frontend/src/components/BottomSheet.tsx`、`frontend/src/components/BottomSheet.test.tsx`
- Modify: `frontend/vitest.config.ts`

**Interfaces:**
- Consumes：無
- Produces：`<BottomSheet open label onClose maxHeightVh?>{children}</BottomSheet>`；`open` 為 false 時渲染 `null`；`maxHeightVh` 預設 `60`

- [ ] **Step 1: 先寫測試 `src/components/BottomSheet.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BottomSheet from './BottomSheet'

function renderSheet(open: boolean, onClose = vi.fn()) {
  render(
    <BottomSheet open={open} label="Components" onClose={onClose}>
      <p>sheet body</p>
    </BottomSheet>
  )
  return onClose
}

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    renderSheet(false)

    expect(screen.queryByText('sheet body')).not.toBeInTheDocument()
  })

  it('shows its label and children when open', () => {
    renderSheet(true)

    expect(screen.getByRole('dialog', { name: 'Components' })).toBeInTheDocument()
    expect(screen.getByText('sheet body')).toBeInTheDocument()
  })

  it('closes when the close button is pressed', async () => {
    const onClose = renderSheet(true)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is pressed', async () => {
    const onClose = renderSheet(true)

    await userEvent.click(screen.getByTestId('bottom-sheet-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

`@testing-library/user-event` 已經是專案依賴（`PwaUpdatePrompt.test.tsx` 使用中），不需要安裝。

- [ ] **Step 2: 確認測試失敗**

Run: `npx vitest run src/components/BottomSheet.test.tsx`
Expected: FAIL，找不到 `./BottomSheet`。

- [ ] **Step 3: 實作 `src/components/BottomSheet.tsx`**

```tsx
import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  label: string
  onClose: () => void
  maxHeightVh?: number
  children: ReactNode
}

function BottomSheet({ open, label, onClose, maxHeightVh = 60, children }: BottomSheetProps) {
  if (!open) return null

  return (
    <>
      <div
        data-testid="bottom-sheet-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          zIndex: 30,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: `${maxHeightVh}vh`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 31,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 44,
              height: 44,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>{children}</div>
      </div>
    </>
  )
}

export default BottomSheet
```

關閉鈕 44×44 是 spec §4.3 的觸控最小尺寸。

遮罩與面板用 `zIndex` 30／31。既有的 `Toast.tsx` 是 `zIndex: 2000`，本來就在面板之上，滿足 spec §4.2「儲存與離線提示不可被底部面板蓋住」。實作時用 DevTools 或一個手動檢查確認這個關係仍然成立，不要只依賴這段說明。

- [ ] **Step 4: 確認測試通過**

Run: `npx vitest run src/components/BottomSheet.test.tsx`
Expected: `4 passed`

- [ ] **Step 5: 加進覆蓋率清單**

`vitest.config.ts` 的 `coverage.include`，在 `'src/components/Toast.tsx',` 上面加一行：

```ts
        'src/components/BottomSheet.tsx',
```

- [ ] **Step 6: 驗證**

```bash
npm run build
npx eslint src/components/BottomSheet.tsx src/components/BottomSheet.test.tsx
npm run lint 2>&1 | grep "✖"
npm test
npm run test:coverage
```

Expected：build 成功；eslint 沒有輸出；`✖ 9 problems (2 errors, 7 warnings)`；`npm test` 90 passed；覆蓋率沒有 threshold 錯誤。

- [ ] **Step 7: Commit**

```bash
git -C .. add frontend/src/components/BottomSheet.tsx frontend/src/components/BottomSheet.test.tsx frontend/vitest.config.ts
git -C .. commit -m "feat: add bottom sheet shell for mobile panels"
```

---

### Task 3: `ComponentDrawer`

**Files:**
- Create: `frontend/src/components/ComponentDrawer.tsx`、`frontend/src/components/ComponentDrawer.test.tsx`
- Modify: `frontend/vitest.config.ts`

**Interfaces:**
- Consumes：`BottomSheet`（Task 2）；`NODE_TYPE_CONFIG`（`../nodes/nodeConfig`，13 個元件，每個有 `label`、`color`、`icon`、`description`、`defaultProperties`）；`ComponentType`（`../types/topology`）
- Produces：`<ComponentDrawer open onClose selectedType onSelect />`；標題文字 `Components`；每個元件是一顆 `aria-pressed` 按鈕

- [ ] **Step 1: 先寫測試 `src/components/ComponentDrawer.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ComponentDrawer from './ComponentDrawer'
import { NODE_TYPE_CONFIG } from '../nodes/nodeConfig'

const TYPE_COUNT = Object.keys(NODE_TYPE_CONFIG).length

describe('ComponentDrawer', () => {
  it('renders nothing when closed', () => {
    render(<ComponentDrawer open={false} onClose={vi.fn()} selectedType={null} onSelect={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lists every component type when open', () => {
    render(<ComponentDrawer open onClose={vi.fn()} selectedType={null} onSelect={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Components' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(TYPE_COUNT)
    expect(screen.getByRole('button', { name: NODE_TYPE_CONFIG.client.label })).toBeInTheDocument()
  })

  it('reports the type that was picked', async () => {
    const onSelect = vi.fn()
    render(<ComponentDrawer open onClose={vi.fn()} selectedType={null} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: NODE_TYPE_CONFIG.cache.label }))

    expect(onSelect).toHaveBeenCalledWith('cache')
  })

  it('marks the pending type as pressed', () => {
    render(<ComponentDrawer open onClose={vi.fn()} selectedType="database" onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: NODE_TYPE_CONFIG.database.label })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npx vitest run src/components/ComponentDrawer.test.tsx`
Expected: FAIL，找不到 `./ComponentDrawer`。

- [ ] **Step 3: 實作 `src/components/ComponentDrawer.tsx`**

```tsx
import BottomSheet from './BottomSheet'
import { NODE_TYPE_CONFIG } from '../nodes/nodeConfig'
import type { ComponentType } from '../types/topology'

const COMPONENT_TYPES = Object.keys(NODE_TYPE_CONFIG) as ComponentType[]

interface ComponentDrawerProps {
  open: boolean
  onClose: () => void
  selectedType: ComponentType | null
  onSelect: (type: ComponentType) => void
}

function ComponentDrawer({ open, onClose, selectedType, onSelect }: ComponentDrawerProps) {
  return (
    <BottomSheet open={open} label="Components" onClose={onClose} maxHeightVh={50}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {COMPONENT_TYPES.map((type) => {
          const config = NODE_TYPE_CONFIG[type]
          const isSelected = selectedType === type
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(type)}
              style={{
                minHeight: 56,
                padding: '8px 4px',
                borderRadius: 8,
                border: `1.5px solid ${config.color}`,
                backgroundColor: isSelected ? `${config.color}35` : `${config.color}12`,
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {config.label}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

export default ComponentDrawer
```

不重用 `Sidebar.tsx` 的 `SidebarItem`：那個元件是 `draggable`、用 rough.js 畫 168px 寬的手繪外框，寬度與互動都不適合 3 欄的觸控格線。

- [ ] **Step 4: 確認測試通過**

Run: `npx vitest run src/components/ComponentDrawer.test.tsx`
Expected: `4 passed`

- [ ] **Step 5: 加進覆蓋率清單**

`vitest.config.ts` 的 `coverage.include`，在剛才加的 `'src/components/BottomSheet.tsx',` 下面加一行：

```ts
        'src/components/ComponentDrawer.tsx',
```

- [ ] **Step 6: 驗證**

```bash
npm run build
npx eslint src/components/ComponentDrawer.tsx src/components/ComponentDrawer.test.tsx
npm run lint 2>&1 | grep "✖"
npm test
npm run test:coverage
```

Expected：build 成功；eslint 沒有輸出；`✖ 9 problems (2 errors, 7 warnings)`；`npm test` 94 passed；覆蓋率沒有 threshold 錯誤。

- [ ] **Step 7: Commit**

```bash
git -C .. add frontend/src/components/ComponentDrawer.tsx frontend/src/components/ComponentDrawer.test.tsx frontend/vitest.config.ts
git -C .. commit -m "feat: add mobile component drawer"
```

---

### Task 4: 畫布觸控：點擊放置、平移、工具列「＋」

**Files:**
- Modify: `frontend/src/components/Canvas.tsx`、`frontend/src/components/CanvasToolbar.tsx`、`frontend/src/index.css`、`frontend/index.html`

**Interfaces:**
- Consumes：`useIsMobile`（Task 1）、`ComponentDrawer`（Task 3）
- Produces：`CanvasToolbar` 新增兩個 props：`isMobile: boolean`、`onOpenComponents: () => void`

**spec 衝突與裁定**：spec §5.1 第 4 點說「放置後節點維持選取，但不自動彈出屬性面板」。但手機版的屬性面板正是由選取驅動（§5.2），兩者不可能同時成立。**裁定：放置後不選取**，與桌面既有的 `onDrop` 行為一致（它也不選取）。若之後想要選取，要連同屬性面板的開啟條件一起重新設計。

- [ ] **Step 1: `Canvas.tsx` 加入 import 與狀態**

在 `import { useOnlineStatus } from '../hooks/useOnlineStatus'` 下面加：

```tsx
import { useIsMobile } from '../hooks/useIsMobile'
import ComponentDrawer from './ComponentDrawer'
```

在 `const isOnline = useOnlineStatus()` 下面加：

```tsx
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingType, setPendingType] = useState<ComponentType | null>(null)
```

`ComponentType` 已經在檔案頂端的 `import type { ... } from '../types/topology'` 之中，不需要另外匯入。

- [ ] **Step 2: 加入放置與畫布點擊的處理**

在 `const onDrop = useCallback(` 這個區塊結束的右括號之後，加入下面兩個 callback。節點建立的欄位與 `onDrop` 完全相同，只是座標來源換成點擊事件：

```tsx
  const placeNodeAt = useCallback(
    (clientX: number, clientY: number, componentType: ComponentType) => {
      if (!rfInstance || !reactFlowWrapper.current) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = rfInstance.screenToFlowPosition({
        x: clientX - bounds.left,
        y: clientY - bounds.top,
      })

      pushHistory()
      const config = NODE_TYPE_CONFIG[componentType]
      const newNode: Node = {
        id: generateNodeId(),
        type: 'architecture',
        position,
        data: {
          label: config.label,
          componentType,
          properties: { ...config.defaultProperties },
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [rfInstance, setNodes, pushHistory]
  )

  // Desktop keeps pendingType null, so this handler is inert there.
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!pendingType) return
      placeNodeAt(event.clientX, event.clientY, pendingType)
      setPendingType(null)
      setDrawerOpen(false)
    },
    [pendingType, placeNodeAt]
  )
```

- [ ] **Step 3: 修改 `<ReactFlow>` 的屬性**

第 1325–1326 行：

```tsx
            selectionOnDrag
            panOnDrag={false}
```

改成：

```tsx
            selectionOnDrag={!isMobile}
            panOnDrag={isMobile}
            onPaneClick={onPaneClick}
            className={isMobile ? 'mobile' : undefined}
```

桌面時 `selectionOnDrag={true}` 與原本的簡寫等價、`panOnDrag={false}` 不變、`onPaneClick` 因為 `pendingType` 恆為 null 而不做事、`className` 為 `undefined` 不會加上任何 class。

- [ ] **Step 4: 渲染抽屜**

在 `<div ref={reactFlowWrapper} ...>` 這個區塊結束之後、元件最外層 `</div>` 之前，加入：

```tsx
      {isMobile && (
        <ComponentDrawer
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false)
            setPendingType(null)
          }}
          selectedType={pendingType}
          onSelect={(type) => setPendingType((current) => (current === type ? null : type))}
        />
      )}
```

選取元件後抽屜維持開啟（spec §5.1 第 2 點允許再點一次取消），放置成功才由 `onPaneClick` 收起。

- [ ] **Step 5: 工具列新增「＋」並隱藏 Merge／Split**

`CanvasToolbar.tsx` 的 props 介面加兩行：

```tsx
  isMobile: boolean
  onOpenComponents: () => void
```

並加進解構參數。接著把 JSX 開頭的兩個按鈕條件改成只在桌面顯示，並在它們前面加上「＋」：

```tsx
        {isMobile && (
          <button
            type="button"
            aria-label="Add component"
            onClick={onOpenComponents}
            style={{
              width: 44,
              height: 44,
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: 20,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            +
          </button>
        )}
        {!isMobile && canMerge && (
```

`canSplit` 那一段同樣改成 `{!isMobile && canSplit && (`。`Add component` 是這個計畫新增的無障礙標籤，spec 沒有定義；其餘文案一律照 spec。

`Canvas.tsx` 的 `<CanvasToolbar` 呼叫端加兩行：

```tsx
        isMobile={isMobile}
        onOpenComponents={() => setDrawerOpen(true)}
```

- [ ] **Step 6: 連接點命中區與 viewport**

`src/index.css` 檔尾附加（這是專案第一條 CSS 規則，只作用於手機的 React Flow 容器）：

```css
/* Mobile only: enlarge the connection handle hit area to 24px without changing
   how it looks — the visible dot is redrawn by the pseudo-element (spec §4.3). */
.react-flow.mobile .react-flow__handle {
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
}

.react-flow.mobile .react-flow__handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #784be8;
}

/* Mobile only: the zoom controls must meet the 44px touch target (spec §4.3). */
.react-flow.mobile .react-flow__controls-button {
  width: 44px;
  height: 44px;
}
```

`frontend/index.html` 第 7 行改成：

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 7: 驗證桌面沒有變化**

```bash
npm run build
npx eslint src/components/Canvas.tsx src/components/CanvasToolbar.tsx
npm run lint 2>&1 | grep "✖"
npm test
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npx playwright test --reporter=line --global-timeout=900000
```

Expected：build 成功；eslint 只有 `Canvas.tsx` 既有的 7 個警告；`✖ 9 problems (2 errors, 7 warnings)`；`npm test` 94 passed；桌面 e2e `178 passed`、`1 skipped`，**截圖必須全過**。截圖若失敗代表桌面渲染被動到，回到 Step 3 檢查 `className` 與 `selectionOnDrag` 的等價性，**不可** `--update-snapshots`。

- [ ] **Step 8: Commit**

```bash
git -C .. add frontend/src/components/Canvas.tsx frontend/src/components/CanvasToolbar.tsx frontend/src/index.css frontend/index.html
git -C .. commit -m "feat: place components by tapping the canvas on mobile"
```

---

### Task 5: 面板改成底部面板、隱藏側邊欄

**Files:**
- Modify: `frontend/src/components/PropertyDock.tsx`、`frontend/src/components/WarningsPanel.tsx`、`frontend/src/components/Canvas.tsx`、`frontend/src/App.tsx`、`frontend/src/components/TabBar.tsx`

**Interfaces:**
- Consumes：`BottomSheet`（Task 2）、`useIsMobile`（Task 1）
- Produces：`PropertyDock` 新增 `isMobile: boolean` 與 `onDeleteSelected: () => void`；`WarningsPanel` 新增 `isMobile: boolean`；`TabBar` 新增 `isMobile: boolean`

- [ ] **Step 1: `PropertyDock` 手機版**

props 介面加兩行 `isMobile: boolean` 與 `onDeleteSelected: () => void`，並加進解構。在原本的 `return (` 之前插入手機分支，桌面路徑一行都不動：

```tsx
  if (isMobile) {
    return (
      <BottomSheet
        open={Boolean(selectedNode || selectedEdgeId)}
        label="Properties"
        onClose={() => setShowPropertyPanel(false)}
      >
        <ComponentPropertyPanel
          selectedNode={selectedNode}
          selectedEdgeId={selectedEdgeId}
          onNodeDataChange={onNodeDataChange}
        />
        <EdgePropertyPanel
          selectedEdgeId={selectedEdgeId}
          edges={edges}
          onEdgeDataChange={onEdgeDataChange}
          onEdgeAnimatedChange={onEdgeAnimatedChange}
          onEdgeDirectionChange={onEdgeDirectionChange}
          onEdgeReverse={onEdgeReverse}
        />
        {selectedNode && (
          <button
            type="button"
            aria-label="Delete component"
            onClick={onDeleteSelected}
            style={{
              marginTop: 12,
              width: '100%',
              minHeight: 44,
              border: '1px solid #dc2626',
              borderRadius: 8,
              background: 'transparent',
              color: '#dc2626',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        )}
      </BottomSheet>
    )
  }
```

檔案頂端加 `import BottomSheet from './BottomSheet'`。

`open` 綁在選取狀態上，而不是恆真：spec §5.2 要求「點空白處取消選取、面板收起」，§7 也要求「屬性面板開啟時節點被刪除 → 面板自動收起」。桌面版的 `showPropertyPanel` 仍然決定這個元件會不會被渲染，手機版再多一層選取條件。

刪除按鈕是 spec §5.3 的要求，**只在手機出現**：桌面維持鍵盤刪除，多一顆按鈕會改變桌面截圖基準。`Delete` 與 `Delete component` 是本計畫新增的文案，spec 未定義。

手機版沒有寬度拖曳把手，所以 `propertyPanelWidth`、`setPropertyPanelWidth`、`isDraggingRef` 在這條路徑上不會用到——它們仍是桌面路徑的必要 props，不要移除。

- [ ] **Step 2: `WarningsPanel` 手機版**

同樣加 `isMobile: boolean`，並在 `return (` 之前插入：

```tsx
  if (isMobile) {
    return (
      <BottomSheet open label="Warnings" onClose={() => setShowWarnings(false)}>
        {activeWarnings.map((warning, index) => (
          <div
            key={`${warning.rule}-${index}`}
            style={{
              padding: '10px 0',
              borderBottom: '1px solid var(--border-color)',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            {warning.message}
          </div>
        ))}
      </BottomSheet>
    )
  }
```

檔案頂端加 `import BottomSheet from './BottomSheet'`。手機版只列出警告文字：桌面版的終端機外觀、忽略按鈕與定位按鈕都依賴滑鼠 hover 與寬版面，不在本次範圍（spec §11）。

若 `Warning` 型別沒有 `rule` 欄位，改用 `warning.message` 當 key 的一部分，並在報告中記錄實際欄位。

- [ ] **Step 3: `Canvas.tsx` 加入刪除並傳入 `isMobile`**

在 `const onNodesDelete = useCallback(` 這個區塊之後加入：

```tsx
  // Routes through React Flow so onNodesDelete still prunes the connected edges
  // and clears the selection, and the history effect records the removal.
  const deleteSelectedNode = useCallback(() => {
    if (!rfInstance || !selectedNodeId) return
    void rfInstance.deleteElements({ nodes: [{ id: selectedNodeId }] })
  }, [rfInstance, selectedNodeId])
```

先讀過 `Canvas.tsx` 的 `onNodesDelete`（大約第 747 行）確認它確實做兩件事：過濾掉與被刪節點相連的邊、在被刪的是目前選取節點時清除選取。它**不會**自己推入歷史——歷史是由監看 `nodes`／`edges` 的既有 effect 捕捉，所以這裡不需要另外呼叫 `pushHistory()`。若實際行為與此不符，停下來回報，不要自行補寫歷史。

`<WarningsPanel` 呼叫端加一行 `isMobile={isMobile}`；`<PropertyDock` 呼叫端加兩行：

```tsx
          isMobile={isMobile}
          onDeleteSelected={deleteSelectedNode}
```

- [ ] **Step 4: `App.tsx` 手機不渲染側邊欄**

頂端加 `import { useIsMobile } from './hooks/useIsMobile'`，在 `const [storage] = useState(() => getBrowserStorage())` 下面加 `const isMobile = useIsMobile()`，並把：

```tsx
      {isSidebarOpen && (
        <Sidebar />
      )}
```

改成：

```tsx
      {!isMobile && isSidebarOpen && (
        <Sidebar />
      )}
```

`<TabBar` 呼叫端加一行 `isMobile={isMobile}`。

- [ ] **Step 5: `TabBar.tsx` 手機隱藏側邊欄開關**

props 介面加 `readonly isMobile: boolean`，加進解構，並把 `onClick={onToggleSidebar}` 那顆 `<button>` 整段包成：

```tsx
        {!isMobile && (
          <button
            onClick={onToggleSidebar}
            ...
          </button>
        )}
```

- [ ] **Step 6: 驗證桌面沒有變化**

```bash
npm run build
npx eslint src/components/PropertyDock.tsx src/components/WarningsPanel.tsx src/App.tsx src/components/TabBar.tsx
npm run lint 2>&1 | grep "✖"
npm test
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npx playwright test --reporter=line --global-timeout=900000
```

Expected：build 成功；eslint 沒有輸出；`✖ 9 problems (2 errors, 7 warnings)`；`npm test` 94 passed；桌面 e2e `178 passed`、`1 skipped`，截圖全過。

- [ ] **Step 7: Commit**

```bash
git -C .. add frontend/src/components/PropertyDock.tsx frontend/src/components/WarningsPanel.tsx frontend/src/components/Canvas.tsx frontend/src/App.tsx frontend/src/components/TabBar.tsx
git -C .. commit -m "feat: show canvas panels as bottom sheets on mobile"
```

---

### Task 6: 手機 Playwright 專案與功能測試

**Files:**
- Modify: `frontend/playwright.config.ts`
- Create: `frontend/e2e/mobile.spec.ts`

**Interfaces:**
- Consumes：`mockAnalysis`、`openApp`、`canvasNodes`、`nodeById`、`storedNodeCounts`（`e2e/support/app.ts`）；`cleanAnalysis`、`warningAnalysis`（`e2e/fixtures/analysis.ts`）
- Produces：`mobile-chromium` 專案，只跑 `mobile.spec.ts` 與 `mobile-visual.spec.ts`

- [ ] **Step 1: 設定手機專案**

`playwright.config.ts` 在 `const OFFLINE_SHELL_SPEC = /offline-shell\.spec\.ts$/` 下面加兩行：

```ts
const MOBILE_SPEC = /mobile\.spec\.ts$/
const MOBILE_VISUAL_SPEC = /mobile-visual\.spec\.ts$/
```

三個桌面專案的 `testIgnore` 各自把這兩個常數加進陣列，例如：

```ts
    testIgnore: [REAL_BACKEND_SPEC, OFFLINE_SHELL_SPEC, MOBILE_SPEC, MOBILE_VISUAL_SPEC],
```

`desktop-chromium-sw` 原本是 `[REAL_BACKEND_SPEC, VISUAL_SPEC]`，同樣補上這兩個。注意 `VISUAL_SPEC` 是 `/visual\.spec\.ts$/`，它也會命中 `mobile-visual.spec.ts`，但另外兩個桌面專案沒有 ignore 它，所以三個專案都必須明確加上 `MOBILE_VISUAL_SPEC`。

在 `mockedProjects` 陣列之後加入：

```ts
const mobileProjects: NonNullable<PlaywrightTestConfig['projects']> = [
  {
    name: 'mobile-chromium',
    testMatch: [MOBILE_SPEC, MOBILE_VISUAL_SPEC],
    use: {
      ...devices['Pixel 5'],
      locale: 'en-US',
      colorScheme: 'light',
      serviceWorkers: 'block',
    },
  },
]
```

並把 `projects` 改成：

```ts
  projects: [...mockedProjects, ...mobileProjects, ...realBackendProjects],
```

`devices['Pixel 5']` 是 393×851、`hasTouch: true` 的設定，`locator.tap()` 才能使用。

- [ ] **Step 2: 寫 `e2e/mobile.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test'
import { cleanAnalysis, warningAnalysis } from './fixtures/analysis'
import { canvasNodes, mockAnalysis, nodeById, openApp, storedNodeCounts } from './support/app'

const PANE = '.react-flow__pane'

async function addComponent(page: Page, label: string, at: { x: number; y: number }): Promise<void> {
  await page.getByRole('button', { name: 'Add component' }).tap()
  await page.getByRole('button', { name: label }).tap()
  await page.locator(PANE).tap({ position: at })
}

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
})

test('hides the desktop sidebar and offers an add button', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Add component' })).toBeVisible()
  await expect(page.getByText('Components', { exact: true })).toHaveCount(0)
})

test('places a component where the canvas is tapped', async ({ page }) => {
  await addComponent(page, 'Client', { x: 140, y: 240 })

  await expect(canvasNodes(page)).toHaveCount(1)
  await expect(page.getByRole('dialog', { name: 'Components' })).toHaveCount(0)
})

test('cancels a pending component when it is tapped again', async ({ page }) => {
  await page.getByRole('button', { name: 'Add component' }).tap()
  const tile = page.getByRole('button', { name: 'Client' })
  await tile.tap()
  await expect(tile).toHaveAttribute('aria-pressed', 'true')

  await tile.tap()
  await expect(tile).toHaveAttribute('aria-pressed', 'false')
  await page.locator(PANE).tap({ position: { x: 140, y: 120 } })

  await expect(canvasNodes(page)).toHaveCount(0)
})

test('edits a label from the property sheet', async ({ page }) => {
  await addComponent(page, 'Service', { x: 160, y: 200 })

  await nodeById(page, 'node-1').tap()
  await expect(page.getByRole('dialog', { name: 'Properties' })).toBeVisible()
  await page.locator('label:text-is("Label") + input').fill('Order Service')

  await expect(nodeById(page, 'node-1')).toContainText('Order Service')
})

test('deletes a component from the property sheet', async ({ page }) => {
  await addComponent(page, 'Service', { x: 160, y: 200 })
  await nodeById(page, 'node-1').tap()

  await page.getByRole('button', { name: 'Delete component' }).tap()

  await expect(canvasNodes(page)).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Properties' })).toHaveCount(0)
})

test('closes the property sheet when the canvas is tapped', async ({ page }) => {
  await addComponent(page, 'Service', { x: 160, y: 200 })
  await nodeById(page, 'node-1').tap()
  await expect(page.getByRole('dialog', { name: 'Properties' })).toBeVisible()

  await page.locator(PANE).tap({ position: { x: 40, y: 80 } })

  await expect(page.getByRole('dialog', { name: 'Properties' })).toHaveCount(0)
})

test('shows analysis warnings in a sheet', async ({ page }) => {
  await mockAnalysis(page, warningAnalysis)
  await page.reload()
  await addComponent(page, 'Service', { x: 160, y: 200 })

  await expect(page.getByText(/\d+ warning\(s\)/)).toBeVisible()
  await page.getByText(/\d+ warning\(s\)/).tap()

  await expect(page.getByRole('dialog', { name: 'Warnings' })).toBeVisible()
})

test('switches canvases from the tab bar', async ({ page }) => {
  await addComponent(page, 'Service', { x: 160, y: 200 })
  await expect(canvasNodes(page)).toHaveCount(1)

  await page.getByTitle('New canvas').tap()
  await expect(canvasNodes(page)).toHaveCount(0)

  await page.getByText('Untitled 1', { exact: true }).tap()
  await expect(canvasNodes(page)).toHaveCount(1)
})

test('restores the canvas after a reload', async ({ page }) => {
  await addComponent(page, 'Database', { x: 160, y: 220 })
  await expect.poll(() => storedNodeCounts(page)).toEqual([1])

  await page.reload()

  await expect(canvasNodes(page)).toHaveCount(1)
})
```

`node-1` 是空白工作區加入的第一個節點的 id（`generateNodeId()` 從既有節點 seed，與 `persistence.spec.ts` 的用法一致）。

- [ ] **Step 3: 跑手機專案**

```bash
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npx playwright test --project=mobile-chromium --reporter=line --global-timeout=900000
```

Expected：`9 passed`。

任何一個失敗都要先判斷是實作問題還是測試問題，並在報告中寫明；**不可**放寬斷言或加 retries。若失敗集中在 `.tap()` 沒有觸發 React Flow 的 pane click，停下來回報 DONE_WITH_CONCERNS，不要改成 `.click()` 繞過——那會讓測試不再驗證觸控路徑。

- [ ] **Step 4: 確認桌面沒有被影響**

```bash
npx playwright test --reporter=line --global-timeout=900000
npm test
npm run lint 2>&1 | grep "✖"
```

Expected：完整 e2e `187 passed`、`1 skipped`（桌面 178 + 手機 9）；`npm test` 94 passed；lint `✖ 9 problems (2 errors, 7 warnings)`。

- [ ] **Step 5: Commit**

```bash
git -C .. add frontend/playwright.config.ts frontend/e2e/mobile.spec.ts
git -C .. commit -m "test: add mobile layout e2e suite"
```

---

### Task 7: 手機截圖基準與文件

**Files:**
- Create: `frontend/e2e/mobile-visual.spec.ts`
- Modify: `CLAUDE.md`、`README.md`

**Interfaces:**
- Consumes：`loadPreset`、`mockAnalysis`、`openApp`、`settleForScreenshot`、`analysisSummary`（`e2e/support/app.ts`）
- Produces：三張 `*-mobile-chromium-darwin.png` 基準

- [ ] **Step 1: 寫 `e2e/mobile-visual.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import { cleanAnalysis } from './fixtures/analysis'
import { analysisSummary, loadPreset, mockAnalysis, openApp, settleForScreenshot } from './support/app'

test.beforeEach(async ({ page }) => {
  await mockAnalysis(page, cleanAnalysis)
  await openApp(page)
})

test('empty canvas', async ({ page }) => {
  await settleForScreenshot(page)

  await expect(page).toHaveScreenshot('mobile-empty-canvas.png')
})

test('Basic preset', async ({ page }) => {
  await loadPreset(page, 'Basic')
  await expect(analysisSummary(page)).toBeVisible()
  await settleForScreenshot(page)

  await expect(page).toHaveScreenshot('mobile-basic-preset.png')
})

test('component drawer', async ({ page }) => {
  await page.getByRole('button', { name: 'Add component' }).tap()
  await expect(page.getByRole('dialog', { name: 'Components' })).toBeVisible()
  await settleForScreenshot(page)

  await expect(page).toHaveScreenshot('mobile-component-drawer.png')
})
```

只做 light 主題：手機版面不隨主題改變，配色已由桌面截圖覆蓋（spec §8.3）。

- [ ] **Step 2: 產生基準並確認穩定**

```bash
npx playwright test --project=mobile-chromium --reporter=line --global-timeout=900000
npx playwright test --project=mobile-chromium --reporter=line --global-timeout=900000
```

Expected：第一次三個截圖測試失敗，訊息是快照不存在、Playwright 已寫入新檔；第二次 `12 passed`。

**不可**使用 `--update-snapshots`。產生後先用 Read 檢視三張 PNG，確認版面正確（底部面板沒有被裁切、元件抽屜是 3 欄、沒有桌面側邊欄），再進入下一步。若畫面明顯不對，那是實作問題，不要把錯誤的畫面當成基準。

- [ ] **Step 3: 重複跑確認不閃爍**

```bash
npx playwright test --project=mobile-chromium --reporter=line --global-timeout=1800000 --repeat-each=3
```

Expected：`36 passed`、0 flaky。

- [ ] **Step 4: 更新 `CLAUDE.md`**

在 `- \`cd frontend && E2E_REAL_BACKEND=1 npx playwright test --project=real-backend\` ...` 那一行下面加：

```markdown
- `cd frontend && npx playwright test --project=mobile-chromium` - Mobile layout suite (Pixel 5, touch)
```

在 Architecture 的 `- **PWA**: ...` 那一行下面加：

```markdown
- **Mobile**: Below 768px — and on short landscape phones — `useIsMobile` switches the layout: the component palette and the property panel become bottom sheets, components are added by tapping the canvas instead of dragging, and one-finger drag pans the canvas. Merge, split, copy/paste and undo/redo stay desktop-only.
```

- [ ] **Step 5: 更新 `README.md`**

在 Features 清單的 `- **Installable & Offline-ready (PWA)**: ...` 下面加：

```markdown
- **Mobile-friendly**: On a phone the panels become bottom sheets, you add components by tapping the canvas, and one finger pans while two fingers zoom.
```

- [ ] **Step 6: 完整驗證**

```bash
npm run build
npx eslint src e2e playwright.config.ts vite.config.ts vitest.config.ts --quiet
npm run lint 2>&1 | grep "✖"
npm test
npm run test:coverage
lsof -iTCP:4173 -sTCP:LISTEN -n -P
npx playwright test --reporter=line --global-timeout=900000
git -C .. diff --stat main -- frontend/e2e/visual.spec.ts-snapshots frontend/e2e/analysis.spec.ts-snapshots frontend/e2e/presets-exports.spec.ts-snapshots
```

Expected：build 成功；`eslint --quiet` 只列出 `src/components/Sidebar.tsx` 的兩個既有錯誤；lint `✖ 9 problems (2 errors, 7 warnings)`；`npm test` 94 passed；覆蓋率沒有 threshold 錯誤；完整 e2e `190 passed`、`1 skipped`；最後一個指令沒有輸出，證明桌面截圖基準一張都沒動。

- [ ] **Step 7: Commit**

```bash
git -C .. add frontend/e2e/mobile-visual.spec.ts frontend/e2e/mobile-visual.spec.ts-snapshots
git -C .. commit -m "test: add mobile screenshot baselines"
git -C .. add CLAUDE.md README.md
git -C .. commit -m "docs: document the mobile layout"
```

---

## 完成後的狀態

- 手機（≤767px 或短邊橫放）可以加入元件、移動、改屬性、刪除，面板為底部面板，單指平移、雙指縮放。
- 桌面三個專案維持 `178 passed / 1 skipped`，截圖基準一張未動；新增 `mobile-chromium` 12 個測試。
- `npm test` 從 81 增加到 94。
- spec §11 明列不在範圍：平板專屬版面、手機端的合併／分割／複製貼上／undo/redo／多選、連線的備案流程、匯出調整、深色主題的手機截圖。
- 人工驗收（spec §9 第 7 項）：真機（iPhone Safari、Android Chrome）安裝後測試加入元件、編輯、刪除、連線、雙指縮放、單指平移，並確認底部面板未被 home indicator 遮住。
