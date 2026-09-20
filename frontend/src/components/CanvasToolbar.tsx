import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { AnalyzeResponse, Warning } from '../types/topology'
import type { Theme } from '../theme/themePreference'
import { practiceQuestions } from '../types/practice'
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
  isMobile: boolean
  onOpenComponents: () => void
  onClearCanvas: () => void
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
  activePracticeId: string | null
  onSelectPractice: (id: string | null) => void
  showPractice: boolean
  setShowPractice: Dispatch<SetStateAction<boolean>>
  practiceRef: RefObject<HTMLDivElement | null>
  practiceTestState?: 'idle' | 'running' | 'finished'
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
  isMobile,
  onOpenComponents,
  onClearCanvas,
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
  activePracticeId,
  onSelectPractice,
  showPractice,
  setShowPractice,
  practiceRef,
  practiceTestState,
}: CanvasToolbarProps) {
  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: 'var(--bg-primary)',
        position: 'relative',
        zIndex: 50,
      }}
    >
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
              flexShrink: 0,
          }}
        >
          +
        </button>
      )}
      {!isMobile && canMerge && (
        <ToolbarButton
          label="Merge"
          shortcut="Ctrl+M"
          onClick={mergeSelectedNodes}
        />
      )}
      {!isMobile && canSplit && (
        <ToolbarButton
          label="Split"
          onClick={splitSelectedNode}
          title="Split merged node back into individual components"
        />
      )}
      {!isOnline && (
        <span
          role="status"
          style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', flexShrink: 0 }}
        >
          {persistenceHealthy
            ? 'Offline — analysis paused. Results may be outdated. Changes are saved locally.'
            : 'Offline — analysis paused. Results may be outdated.'}
        </span>
      )}
      {analysisResult && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {analysisResult.success
              ? `${analysisResult.nodeCount} nodes, ${analysisResult.edgeCount} edges`
              : 'Analysis failed'}
            {activeWarnings.length > 0 && (
              <span 
                onClick={() => setShowWarnings((prev) => !prev)}
                style={{ 
                  color: 'var(--text-secondary)',
                  marginLeft: 8,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                {activeWarnings.length} warning(s)
              </span>
            )}
          </span>
        </div>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexShrink: 1 }}>
        <div ref={practiceRef} style={{ position: 'relative', maxWidth: '100%' }}>
          <button
            onClick={() => setShowPractice(prev => !prev)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: activePracticeId ? 'var(--accent)' : 'var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: activePracticeId ? 'var(--accent)' : 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 400,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              maxWidth: isMobile ? '150px' : '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activePracticeId 
              ? `Practice: ${practiceQuestions.find(q => q.id === activePracticeId)?.title || 'Question'}`
              : 'Practice ▾'}
          </button>
          {showPractice && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              minWidth: 130,
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              zIndex: 100,
            }}>
              {practiceQuestions.map(({ id, title }) => {
                const isDisabled = activePracticeId !== null && practiceTestState === 'running' && activePracticeId !== id;
                return (
                  <button
                    key={id}
                    onClick={() => { if (!isDisabled) { onSelectPractice(id); setShowPractice(false); } }}
                    disabled={isDisabled}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: isDisabled ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontSize: 14,
                      fontWeight: 400,
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                    onMouseLeave={e => { if (!isDisabled) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    {title}
                  </button>
                )
              })}
              {activePracticeId && (
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem(`architectmind:practiceState:${activePracticeId}`)
                      localStorage.removeItem(`architectmind:practiceEndTime:${activePracticeId}`)
                    } catch {}
                    onSelectPractice(null)
                    setShowPractice(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--warning)',
                    fontSize: 14,
                    fontWeight: 400,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  Exit Practice
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={presetsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPresets(prev => !prev)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 400,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Demo ▾
            </button>
          {showPresets && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              minWidth: 130,
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              zIndex: 100,
            }}>
              {[
                { label: 'Basic', handler: handleDemo },
                { label: 'Twitter', handler: handleTwitter },
                { label: 'YouTube', handler: handleYouTube },
                { label: 'Google', handler: handleGoogle },
              ].map(({ label, handler }) => (
                <button
                  key={label}
                  onClick={() => { handler(); setShowPresets(false) }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontWeight: 400,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          if (window.confirm('Are you sure you want to clear the canvas?')) {
            onClearCanvas()
          }
        }}
        style={{
          padding: '6px 14px',
          borderRadius: 6,
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          color: '#dc2626',
          fontSize: 13,
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        title="Clear Canvas"
      >
        Clear
      </button>

      <SettingsMenu 
        theme={theme} 
        setTheme={setTheme} 
        getNodes={() => nodes}
        getEdges={() => edges}
      />
    </div>
  </div>
  )
}

export default CanvasToolbar
