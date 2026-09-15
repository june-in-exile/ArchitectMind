import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NoticeKind } from './selectNotice'
import { useDismissibleNotice } from './useDismissibleNotice'

const renderNotice = (initialKind: NoticeKind | null) =>
  renderHook(({ kind }: { readonly kind: NoticeKind | null }) => useDismissibleNotice(kind), {
    initialProps: { kind: initialKind },
  })

describe('useDismissibleNotice', () => {
  it('shows nothing while no notice is selected', () => {
    const { result } = renderNotice(null)

    expect(result.current.visibleKind).toBeNull()
  })

  it('hides a dismissed notice for as long as its kind stays selected', () => {
    const { result, rerender } = renderNotice('quota')
    expect(result.current.visibleKind).toBe('quota')

    act(() => result.current.dismiss())
    rerender({ kind: 'quota' })

    expect(result.current.visibleKind).toBeNull()
  })

  it('shows the same kind again after the notice cleared', () => {
    const { result, rerender } = renderNotice('quota')
    act(() => result.current.dismiss())

    rerender({ kind: null })
    expect(result.current.visibleKind).toBeNull()
    rerender({ kind: 'quota' })

    expect(result.current.visibleKind).toBe('quota')
  })

  it('shows a different kind right after one was dismissed', () => {
    const { result, rerender } = renderNotice('restore-failed')
    act(() => result.current.dismiss())

    rerender({ kind: 'quota' })

    expect(result.current.visibleKind).toBe('quota')
  })

  it('shows a dismissed quota notice again when saving fails after the restore notice came back', () => {
    const { result, rerender } = renderNotice('quota')
    act(() => result.current.dismiss())

    rerender({ kind: 'restore-failed' })
    expect(result.current.visibleKind).toBe('restore-failed')
    rerender({ kind: 'quota' })

    expect(result.current.visibleKind).toBe('quota')
  })
})
