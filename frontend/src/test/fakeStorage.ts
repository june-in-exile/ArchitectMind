export interface FakeStorageOptions {
  readonly getError?: Error
  readonly setError?: Error
  /** When set, only writes to this key throw `setError`. */
  readonly failingSetKey?: string
}

export function createFakeStorage(
  initial: Readonly<Record<string, string>> = {},
  options: FakeStorageOptions = {},
): Storage {
  const items = new Map(Object.entries(initial))
  const shouldFailSet = (key: string) =>
    options.setError !== undefined && (options.failingSetKey === undefined || options.failingSetKey === key)

  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => {
      if (options.getError) throw options.getError
      return items.get(key) ?? null
    },
    setItem: (key, value) => {
      if (shouldFailSet(key)) throw options.setError
      items.set(key, String(value))
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
}
