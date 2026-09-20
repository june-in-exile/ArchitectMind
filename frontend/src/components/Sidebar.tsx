import { memo, useRef, useEffect, useMemo, useState } from 'react'
import type { ComponentType } from '../types/topology'
import { NODE_TYPE_CONFIG } from '../nodes/nodeConfig'
import logo from '../assets/logo.svg'
import rough from 'roughjs'
import { stableSeed } from '../utils/rough'

const COMPONENT_TYPES = Object.keys(NODE_TYPE_CONFIG) as ComponentType[]

interface SidebarProps {}

const SidebarItem = memo(({ type, onDragStart }: { type: ComponentType, onDragStart: (e: React.DragEvent, type: ComponentType) => void }) => {
  const config = NODE_TYPE_CONFIG[type]
  const svgRef = useRef<SVGSVGElement>(null)
  const seed = useMemo(() => stableSeed(type), [type])
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = svgRef.current
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    const rc = rough.svg(svg)
    const rect = rc.rectangle(3, 3, 162, 34, {
      stroke: config.color,
      strokeWidth: isHovered ? 2 : 1.5,
      fill: isHovered ? `${config.color}25` : `${config.color}12`,
      fillStyle: 'solid',
      roughness: 1.2,
      seed,
    })
    svg.appendChild(rect)
  }, [config.color, seed, isHovered])

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={config.description}
      style={{
        position: 'relative',
        width: 168,
        height: 40,
        marginBottom: 12,
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        color: 'var(--text-primary)',
        fontSize: 14,
        fontFamily: 'var(--font-hand)',
        transition: 'transform 0.1s ease',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <svg
        ref={svgRef}
        width={168}
        height={40}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      />
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: 8 
      }}>
        {config.icon && <span style={{ fontSize: 18 }}>{config.icon}</span>}
        <span style={{ fontWeight: 600 }}>{config.label}</span>
      </div>
    </div>
  )
})

function Sidebar({}: SidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('architectmind:sidebarWidth')
    return saved ? parseInt(saved, 10) : 200
  })
  const isDraggingRef = useRef(false)

  const onDragStart = (
    event: React.DragEvent,
    componentType: ComponentType
  ) => {
    event.dataTransfer.setData('application/architectmind', componentType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex' }}>
      <aside
        style={{
          width: sidebarWidth,
          padding: 0,
          borderRight: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Brand Header at Top-Left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '20px 16px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 16,
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <img 
            src={logo} 
            alt="ArchitectMind Logo" 
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 8,
              objectFit: 'contain'
            }} 
          />
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-hand)',
            }}
          >
            Architect<span style={{ color: 'var(--accent)' }}>Mind</span>
          </h2>
        </div>

        <div style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3
            style={{
              display: 'block',
              marginBottom: 12,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              width: '100%',
            }}
          >
            Components
          </h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {COMPONENT_TYPES.map((type) => (
              <SidebarItem key={type} type={type} onDragStart={onDragStart} />
            ))}
          </div>
        </div>
      </aside>
      <div
        onMouseDown={(e) => {
          e.preventDefault()
          isDraggingRef.current = true
          const startX = e.clientX
          const startWidth = sidebarWidth
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX
            const newWidth = Math.max(160, Math.min(400, startWidth + delta))
            setSidebarWidth(newWidth)
          }
          const handleMouseUp = (upEvent: MouseEvent) => {
            isDraggingRef.current = false
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            
            // Save final width
            const delta = upEvent.clientX - startX
            const finalWidth = Math.max(160, Math.min(400, startWidth + delta))
            localStorage.setItem('architectmind:sidebarWidth', finalWidth.toString())
          }
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
        style={{
          position: 'absolute',
          right: -4,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 20,
          backgroundColor: 'transparent',
        }}
        title="Resize panel"
      />
    </div>
  )
}

export default Sidebar
