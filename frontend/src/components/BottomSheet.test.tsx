import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
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

    expect(screen.queryByText('sheet body')).not.toBeInTheDocument()
  })

  it('shows its label and children when open', () => {
    renderSheet(true)

    expect(screen.getByRole('dialog', { name: 'Components' })).toBeInTheDocument()
    expect(screen.getByText('sheet body')).toBeInTheDocument()
  })

  it('closes when the close button is pressed', async () => {
    const onClose = renderSheet(true)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is pressed', async () => {
    const onClose = renderSheet(true)

    await userEvent.click(screen.getByTestId('bottom-sheet-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
