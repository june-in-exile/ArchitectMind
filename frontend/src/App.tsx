import { useState, useEffect, useCallback } from 'react'
import type { Edge, Node } from '@xyflow/react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import TabBar from './components/TabBar'
import { useCanvasTabs } from './hooks/useCanvasTabs'
import type { SystemParams } from './types/topology'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk'>(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk'
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'warm', 'dream', 'cyberpunk')
    if (theme !== 'light') {
      document.documentElement.classList.add(theme)
    }
    localStorage.setItem('theme', theme)
  }, [theme])

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
    </div>
  )
}

export default App
