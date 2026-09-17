import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import type { AnalyzeResponse, Warning } from '../types/topology'
import BottomSheet from './BottomSheet'

interface WarningsPanelProps {
  panelHeight: number
  onDragStart: (e: MouseEvent) => void
  analysisResult: AnalyzeResponse | null
  activeWarnings: Warning[]
  dismissedWarnings: Set<number>
  setDismissedWarnings: Dispatch<SetStateAction<Set<number>>>
  setShowWarnings: Dispatch<SetStateAction<boolean>>
  fitViewToNode: (nodeId: string) => void
  tooltipBg: string
  tooltipHover: string
  isMobile: boolean
}

function WarningsPanel({
  panelHeight,
  onDragStart,
  analysisResult,
  activeWarnings,
  dismissedWarnings,
  setDismissedWarnings,
  setShowWarnings,
  fitViewToNode,
  tooltipBg,
  tooltipHover,
  isMobile,
}: WarningsPanelProps) {
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

  return (
    <div
      style={{
        height: panelHeight,
        minHeight: 100,
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        position: 'relative',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        onMouseDown={onDragStart}
        style={{
          position: 'absolute',
          top: -4,
          left: 0,
          right: 0,
          height: 8,
          cursor: 'row-resize',
          zIndex: 20,
          backgroundColor: 'transparent',
        }}
      />
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '36px',
      }}>
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            borderBottom: '1px solid var(--text-primary)',
            padding: '0 8px',
            marginBottom: '-1px',
            gap: 8,
          }}>
            <h3 style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: 0.5 }}>
              PROBLEMS
            </h3>
            <span style={{ 
              backgroundColor: tooltipBg,
              color: 'var(--text-primary)', 
              padding: '2px 6px', 
              borderRadius: 12, 
              fontSize: 10,
              fontWeight: 600,
            }}>{activeWarnings.length}</span>
          </div>
        </div>
        <button 
          onClick={() => setShowWarnings(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            lineHeight: 1,
            borderRadius: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--text-primary)'
            e.currentTarget.style.color = 'var(--bg-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          title="Close Panel"
        >
          ×
        </button>
      </div>
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {analysisResult?.warnings?.map((w, idx) => {
          if (dismissedWarnings.has(idx)) return null
          return (
            <div 
              key={idx} 
              onClick={() => {
                if (w.nodeIds && w.nodeIds.length > 0) {
                  fitViewToNode(w.nodeIds[0])
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tooltipHover
                const closeBtn = e.currentTarget.querySelector('.dismiss-btn') as HTMLElement
                if (closeBtn) closeBtn.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                const closeBtn = e.currentTarget.querySelector('.dismiss-btn') as HTMLElement
                if (closeBtn) closeBtn.style.opacity = '0'
              }}
              style={{
                padding: '8px 16px 8px 36px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                cursor: w.nodeIds && w.nodeIds.length > 0 ? 'pointer' : 'default',
                position: 'relative',
                transition: 'background-color 0.1s ease',
              }}
            >
              <svg 
                viewBox="0 0 16 16" 
                fill="#f59e0b" 
                style={{ position: 'absolute', left: 14, top: 10, width: 14, height: 14 }}
              >
                <path fillRule="evenodd" clipRule="evenodd" d="M7.56 1h.88l6.5 13v.88H1.05V14l6.5-13zm.45 1.74l-5.6 11.2h11.2L8.01 2.74zM9 12.01H7v-1.9h2v1.9zm0-2.92H7V5.01h2v4.08z" />
              </svg>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span>{w.message}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7, fontFamily: 'sans-serif' }}>
                    [{w.rule.replace(/_/g, ' ')}]
                  </span>
                </div>
                <button
                  className="dismiss-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDismissedWarnings(prev => {
                      const next = new Set(prev)
                      next.add(idx)
                      return next
                    })
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 16,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    marginLeft: 8,
                  }}
                  title="Dismiss warning"
                >
                  ×
                </button>
              </div>

              {w.solution && (
                <div style={{ 
                  fontSize: 12, 
                  color: 'var(--text-secondary)', 
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  marginTop: 4
                }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12, marginTop: 2, flexShrink: 0, opacity: 0.7 }}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M8 1.5a4.5 4.5 0 00-4.5 4.5c0 1.25.5 2.4 1.34 3.23.4.4.66.95.66 1.52A1.25 1.25 0 006.75 12h2.5a1.25 1.25 0 001.25-1.25c0-.57.26-1.12.66-1.52.84-.83 1.34-1.98 1.34-3.23A4.5 4.5 0 008 1.5zm-3.5 4.5a3.5 3.5 0 117 0c0 .99-.4 1.88-1.04 2.53-.54.54-.86 1.26-.86 2.02v.2H6.4v-.2c0-.76-.32-1.48-.86-2.02A3.5 3.5 0 014.5 6zM6 13.5v.5a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-.5H6z" />
                  </svg>
                  <span style={{ fontStyle: 'italic', opacity: 0.9 }}>{w.solution}</span>
                </div>
              )}
              
              {w.nodeIds && w.nodeIds.length > 0 && (
                <div style={{ fontSize: 11, color: '#3b82f6', opacity: 0.9, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', marginTop: 4 }}>
                  Nodes: {w.nodeIds.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WarningsPanel
