import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NOTICE_MESSAGES, selectNotice, type NoticeState } from '../notices/selectNotice'
import { useDismissibleNotice } from '../notices/useDismissibleNotice'
import PersistenceNotice from './PersistenceNotice'

const healthy = { persistenceBlocked: null, saveError: null, restoreFailed: false } as const

interface NoticeHarnessProps extends NoticeState {
  readonly onReload: () => void
  readonly noticeMounted?: boolean
}

// Mirrors App: the dismissal lives above PersistenceNotice, which PwaUpdatePrompt unmounts while it shows.
function NoticeHarness({ onReload, noticeMounted = true, ...state }: NoticeHarnessProps) {
  const { visibleKind, dismiss } = useDismissibleNotice(selectNotice(state))
  return noticeMounted ? <PersistenceNotice kind={visibleKind} onDismiss={dismiss} onReload={onReload} /> : null
}

describe('PersistenceNotice', () => {
  it('renders nothing while persistence is healthy', () => {
    const { container } = render(<NoticeHarness {...healthy} onReload={vi.fn()} />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the selected notice without a reload button until it is dismissed', () => {
    render(<NoticeHarness {...healthy} saveError="quota" onReload={vi.fn()} />)
    expect(screen.getByText(NOTICE_MESSAGES.quota)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText(NOTICE_MESSAGES.quota)).toBeNull()
  })

  it('offers a reload for a workspace saved by a newer version', () => {
    const onReload = vi.fn()
    render(<NoticeHarness {...healthy} persistenceBlocked="newer-version" onReload={onReload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('shows a different notice after one was dismissed', () => {
    const { rerender } = render(<NoticeHarness {...healthy} restoreFailed onReload={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    rerender(<NoticeHarness {...healthy} restoreFailed saveError="quota" onReload={vi.fn()} />)

    expect(screen.getByText(NOTICE_MESSAGES.quota)).toBeTruthy()
  })

  it('keeps a dismissed notice hidden after the notice is unmounted and mounted again', () => {
    const onReload = vi.fn()
    const { rerender } = render(<NoticeHarness {...healthy} saveError="quota" onReload={onReload} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    rerender(<NoticeHarness {...healthy} saveError="quota" noticeMounted={false} onReload={onReload} />)
    rerender(<NoticeHarness {...healthy} saveError="quota" onReload={onReload} />)

    expect(screen.queryByText(NOTICE_MESSAGES.quota)).toBeNull()
  })
})
