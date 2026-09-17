import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  label: string
  onClose: () => void
  maxHeightVh?: number
  children: ReactNode
}

type BottomSheetControls = Pick<BottomSheetProps, 'label' | 'onClose'>

interface BottomSheetPanelProps extends BottomSheetControls {
  maxHeightVh: number
  children: ReactNode
}

function BottomSheetBackdrop({ onClose }: Pick<BottomSheetProps, 'onClose'>) {
  return (
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
  )
}

function BottomSheetHeader({ label, onClose }: BottomSheetControls) {
  return (
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
  )
}

function BottomSheetPanel({ label, onClose, maxHeightVh, children }: BottomSheetPanelProps) {
  return (
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
      <BottomSheetHeader label={label} onClose={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>{children}</div>
    </div>
  )
}

function BottomSheet({ open, label, onClose, maxHeightVh = 60, children }: BottomSheetProps) {
  if (!open) return null

  return (
    <>
      <BottomSheetBackdrop onClose={onClose} />
      <BottomSheetPanel label={label} onClose={onClose} maxHeightVh={maxHeightVh}>
        {children}
      </BottomSheetPanel>
    </>
  )
}

export default BottomSheet
