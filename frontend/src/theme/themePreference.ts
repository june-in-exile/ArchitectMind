export type Theme = 'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk'

export const THEME_STORAGE_KEY = 'theme'

const THEMES: readonly string[] = ['light', 'dark', 'warm', 'dream', 'cyberpunk']

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && THEMES.includes(value)
}

export function readThemePreference(storage: Storage | null, prefersDark: boolean): Theme {
  const fallback: Theme = prefersDark ? 'dark' : 'light'
  if (!storage) return fallback
  try {
    const saved = storage.getItem(THEME_STORAGE_KEY)
    return isTheme(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

export function writeThemePreference(storage: Storage | null, theme: Theme): void {
  if (!storage) return
  try {
    storage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The theme still applies for this session when the browser refuses to store it.
  }
}
