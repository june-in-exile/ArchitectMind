import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NOTICE_MESSAGES } from '../notices/selectNotice'
import PersistenceNotice from './PersistenceNotice'

const healthy = { persistenceBlocked: null, saveError: null, restoreFailed: false } as const

describe('PersistenceNotice', () => {
  it('renders nothing while persistence is healthy', () => {
    const { container } = render(<PersistenceNotice {...healthy} onReload={vi.fn()} />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the selected notice without a reload button until it is dismissed', () => {
    render(<PersistenceNotice {...healthy} saveError="quota" onReload={vi.fn()} />)
    expect(screen.getByText(NOTICE_MESSAGES.quota)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText(NOTICE_MESSAGES.quota)).toBeNull()
  })

  it('offers a reload for a workspace saved by a newer version', () => {
    const onReload = vi.fn()
    render(<PersistenceNotice {...healthy} persistenceBlocked="newer-version" onReload={onReload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('shows a different notice after one was dismissed', () => {
    const { rerender } = render(<PersistenceNotice {...healthy} restoreFailed onReload={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    rerender(<PersistenceNotice {...healthy} restoreFailed saveError="quota" onReload={vi.fn()} />)

    expect(screen.getByText(NOTICE_MESSAGES.quota)).toBeTruthy()
  })
})
