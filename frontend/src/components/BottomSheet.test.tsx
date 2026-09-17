import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BottomSheet from './BottomSheet'

function renderSheet(open: boolean, onClose = vi.fn()) {
  render(
    <BottomSheet open={open} label="Components" onClose={onClose}>
      <p>sheet body</p>
    </BottomSheet>
  )
  return onClose
}

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    renderSheet(false)

    expect(screen.queryByText('sheet body')).toBeNull()
  })

  it('shows its label and children when open', () => {
    renderSheet(true)

    expect(screen.getByRole('dialog', { name: 'Components' })).toBeTruthy()
    expect(screen.getByText('sheet body')).toBeTruthy()
  })

  it('closes when the close button is pressed', () => {
    const onClose = renderSheet(true)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is pressed', () => {
    const onClose = renderSheet(true)

    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
