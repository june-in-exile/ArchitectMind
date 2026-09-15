// Resolved in place of `virtual:pwa-register/react` under vitest; tests override it with vi.mock.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => undefined],
    offlineReady: [false, () => undefined],
    updateServiceWorker: () => Promise.resolve(),
  }
}
