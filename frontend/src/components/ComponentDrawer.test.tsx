import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ComponentDrawer from './ComponentDrawer'
import { NODE_TYPE_CONFIG } from '../nodes/nodeConfig'

const TYPE_COUNT = Object.keys(NODE_TYPE_CONFIG).length

describe('ComponentDrawer', () => {
  it('renders nothing when closed', () => {
    render(<ComponentDrawer open={false} onClose={vi.fn()} selectedType={null} onSelect={vi.fn()} />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lists every component type when open', () => {
    render(<ComponentDrawer open onClose={vi.fn()} selectedType={null} onSelect={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Components' })).toBeTruthy()
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(TYPE_COUNT)
    expect(screen.getByRole('button', { name: NODE_TYPE_CONFIG.client.label })).toBeTruthy()
  })

  it('reports the type that was picked', () => {
    const onSelect = vi.fn()
    render(<ComponentDrawer open onClose={vi.fn()} selectedType={null} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: NODE_TYPE_CONFIG.cache.label }))

    expect(onSelect).toHaveBeenCalledWith('cache')
  })

  it('marks the pending type as pressed', () => {
    render(<ComponentDrawer open onClose={vi.fn()} selectedType="database" onSelect={vi.fn()} />)

    const selectedButton = screen.getByRole('button', { name: NODE_TYPE_CONFIG.database.label })

    expect(selectedButton.getAttribute('aria-pressed')).toBe('true')
    expect(selectedButton.style.borderColor).toBe('var(--accent)')
    expect(selectedButton.style.boxShadow).not.toBe('')
    expect(selectedButton.querySelector('[aria-hidden="true"]')?.textContent).toBe('✓')
  })

  it('uses the hand-drawn typeface for component names', () => {
    render(<ComponentDrawer open onClose={vi.fn()} selectedType={null} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: NODE_TYPE_CONFIG.client.label }).style.fontFamily).toBe('var(--font-hand)')
  })
})
