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
