export interface ToastAction {
  readonly label: string
  readonly onClick: () => void
}

interface ToastProps {
  readonly message: string
  readonly actions: readonly ToastAction[]
}

export default function Toast({ message, actions }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 2000,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 8,
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: 13,
        lineHeight: 1.45,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <span>{message}</span>
      {actions.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
