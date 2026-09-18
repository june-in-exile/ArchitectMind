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
