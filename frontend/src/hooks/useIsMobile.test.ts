import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOBILE_QUERY, useIsMobile } from './useIsMobile'

type Listener = () => void

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>()
  let matches = initial
  const queries: string[] = []
  vi.stubGlobal(
    'matchMedia',
    (query: string) => {
      queries.push(query)
      return {
        media: query,
        get matches() {
          return matches
        },
        addEventListener: (_type: 'change', listener: Listener) => {
          listeners.add(listener)
        },
        removeEventListener: (_type: 'change', listener: Listener) => {
          listeners.delete(listener)
        },
      }
    }
  )
  return {
    queries,
    listenerCount: () => listeners.size,
    setMatches(next: boolean) {
      matches = next
      listeners.forEach((listener) => listener())
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useIsMobile', () => {
  it('uses the breakpoint from the spec, including landscape phones', () => {
    expect(MOBILE_QUERY).toBe('(max-width: 767px), (orientation: landscape) and (max-height: 500px)')
  })

  it('returns false on a desktop viewport', () => {
    const media = stubMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
    expect(media.queries).toContain(MOBILE_QUERY)
  })

  it('returns true when the query matches', () => {
    stubMatchMedia(true)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('re-renders when the viewport crosses the breakpoint', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())

    act(() => media.setMatches(true))

    expect(result.current).toBe(true)
  })

  it('removes its listener on unmount', () => {
    const media = stubMatchMedia(true)
    const { unmount } = renderHook(() => useIsMobile())
    expect(media.listenerCount()).toBe(1)

    unmount()

    expect(media.listenerCount()).toBe(0)
  })
})
