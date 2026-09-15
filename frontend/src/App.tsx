import { useState, useEffect, useCallback } from 'react'
import type { Edge, Node } from '@xyflow/react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import TabBar from './components/TabBar'
import PersistenceNotice from './components/PersistenceNotice'
import PwaUpdatePrompt from './components/PwaUpdatePrompt'
import { useCanvasTabs } from './hooks/useCanvasTabs'
import { selectNotice } from './notices/selectNotice'
import { useDismissibleNotice } from './notices/useDismissibleNotice'
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
    flush,
    saveError,
    persistenceBlocked,
    restoreFailed,
  } = useCanvasTabs()
  // Held here rather than in PersistenceNotice, which PwaUpdatePrompt unmounts while an update is offered.
  const { visibleKind: noticeKind, dismiss: dismissNotice } = useDismissibleNotice(
    selectNotice({ persistenceBlocked, saveError, restoreFailed })
  )

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
          persistenceHealthy={persistenceBlocked === null && saveError === null}
          onStateChange={handleCanvasStateChange}
        />
      </div>
      <PwaUpdatePrompt
        onBeforeUpdate={flush}
        fallback={<PersistenceNotice kind={noticeKind} onDismiss={dismissNotice} onReload={reloadPage} />}
      />
    </div>
  )
}

export default App
