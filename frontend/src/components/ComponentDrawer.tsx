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
    <BottomSheet
      open={open}
      label="Components"
      onClose={onClose}
      maxHeightVh={50}
      backdropPassthrough
    >
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
                position: 'relative',
                minHeight: 56,
                padding: '8px 4px',
                borderRadius: 8,
                borderWidth: isSelected ? 2 : 1.5,
                borderStyle: 'solid',
                borderColor: isSelected ? 'var(--accent)' : config.color,
                backgroundColor: isSelected
                  ? 'color-mix(in srgb, var(--accent) 28%, var(--bg-primary))'
                  : `${config.color}12`,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-hand)',
                fontSize: 16,
                fontWeight: 600,
                boxShadow: isSelected
                  ? 'inset 0 0 0 1px var(--accent), 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent)'
                  : 'none',
                cursor: 'pointer',
              }}
            >
              {config.label}
              {isSelected && (
                <span
                  aria-hidden="true"
                  style={{ position: 'absolute', top: 4, right: 7, color: 'var(--accent)', fontSize: 14 }}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

export default ComponentDrawer
