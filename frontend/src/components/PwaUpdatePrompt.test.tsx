import type { Dispatch, SetStateAction } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { SaveResult } from '../persistence/workspaceStorage'
import PwaUpdatePrompt from './PwaUpdatePrompt'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: vi.fn() }))

const UPDATE_MESSAGE = 'A new version is available.'
const UNSAVED_MESSAGE = "Your latest changes couldn't be saved. Reload anyway?"

describe('PwaUpdatePrompt', () => {
  let updateServiceWorker: ReturnType<typeof vi.fn<(reloadPage?: boolean) => Promise<void>>>
  let setNeedRefresh: ReturnType<typeof vi.fn<Dispatch<SetStateAction<boolean>>>>

  const mockRegistration = (needRefresh: boolean) => {
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [needRefresh, setNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    })
  }

  const renderPrompt = (result: SaveResult) => {
    const onBeforeUpdate = vi.fn((): SaveResult => result)
    render(<PwaUpdatePrompt onBeforeUpdate={onBeforeUpdate} fallback={<p>storage notice</p>} />)
    return onBeforeUpdate
  }

  beforeEach(() => {
    updateServiceWorker = vi.fn<(reloadPage?: boolean) => Promise<void>>(() => Promise.resolve())
    setNeedRefresh = vi.fn()
  })

  it('shows only the fallback while no update is waiting', () => {
    mockRegistration(false)

    renderPrompt({ ok: true })

    expect(screen.getByText('storage notice')).toBeTruthy()
    expect(screen.queryByText(UPDATE_MESSAGE)).toBeNull()
  })

  it('saves first and then activates the waiting update', () => {
    mockRegistration(true)
    const onBeforeUpdate = renderPrompt({ ok: true })
    expect(screen.queryByText('storage notice')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(onBeforeUpdate).toHaveBeenCalledTimes(1)
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
    expect(onBeforeUpdate.mock.invocationCallOrder[0]).toBeLessThan(updateServiceWorker.mock.invocationCallOrder[0])
  })

  it('asks before reloading when the latest changes could not be saved', () => {
    mockRegistration(true)
    renderPrompt({ ok: false, reason: 'quota' })

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(updateServiceWorker).not.toHaveBeenCalled()
    expect(screen.getByText(UNSAVED_MESSAGE)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reload anyway' }))

    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('returns to the update prompt on Cancel', () => {
    mockRegistration(true)
    renderPrompt({ ok: false, reason: 'blocked' })
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText(UPDATE_MESSAGE)).toBeTruthy()
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('closes the prompt on Later', () => {
    mockRegistration(true)
    renderPrompt({ ok: true })

    fireEvent.click(screen.getByRole('button', { name: 'Later' }))

    expect(setNeedRefresh).toHaveBeenCalledWith(false)
  })

  it('registers with a registration error handler that stays silent', () => {
    mockRegistration(false)
    renderPrompt({ ok: true })

    const options = vi.mocked(useRegisterSW).mock.calls[0][0]

    expect(typeof options?.onRegisterError).toBe('function')
    expect(() => options?.onRegisterError?.(new Error('blocked'))).not.toThrow()
  })
})
