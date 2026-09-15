import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Toast from './Toast'

describe('Toast', () => {
  it('shows the message and runs an action when its button is clicked', () => {
    const onReload = vi.fn()
    render(<Toast message="Storage is full." actions={[{ label: 'Reload', onClick: onReload }]} />)

    expect(screen.getByRole('status').textContent).toContain('Storage is full.')
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('renders no buttons without actions', () => {
    render(<Toast message="Saved." actions={[]} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
