import { useSyncExternalStore } from 'react'

// Spec §4.1: the second clause catches landscape phones, whose width exceeds
// the breakpoint while the height is far too small for the desktop layout.
export const MOBILE_QUERY = '(max-width: 767px), (orientation: landscape) and (max-height: 500px)'

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getSnapshot = (): boolean => window.matchMedia(MOBILE_QUERY).matches
const getServerSnapshot = (): boolean => false

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
