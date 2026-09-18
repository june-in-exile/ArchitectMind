import type { ComponentProps, Dispatch, RefObject, SetStateAction } from 'react'
import ComponentPropertyPanel from './ComponentPropertyPanel'
import BottomSheet from './BottomSheet'
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
  isMobile: boolean
  onDeleteSelected: () => void
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
  isMobile,
  onDeleteSelected,
}: PropertyDockProps) {
  if (isMobile) {
    return (
      <BottomSheet
        open={Boolean(selectedNode || selectedEdgeId)}
        label="Properties"
        onClose={() => setShowPropertyPanel(false)}
        backdropPassthrough
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

  return (
    <div style={{ position: 'relative' }}>
      <div
        onMouseDown={(e) => {
          e.preventDefault()
          isDraggingRef.current = true
          const startX = e.clientX
          const startWidth = propertyPanelWidth
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = startX - moveEvent.clientX
            const newWidth = Math.max(200, Math.min(600, startWidth + delta))
            setPropertyPanelWidth(newWidth)
          }
          const handleMouseUp = () => {
            isDraggingRef.current = false
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
        style={{
          position: 'absolute',
          left: -4,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 20,
          backgroundColor: 'transparent',
        }}
        title="Resize panel"
      />
      <div
        style={{
          width: propertyPanelWidth,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Properties</span>
          <button
            onClick={() => setShowPropertyPanel(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 16,
              padding: 2,
              lineHeight: 1,
              borderRadius: 3,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
            title="Close panel"
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
        </div>
      </div>
    </div>
  )
}

export default PropertyDock
