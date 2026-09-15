import { describe, expect, it } from 'vitest'
import { createFakeStorage } from '../test/fakeStorage'
import { THEME_STORAGE_KEY, readThemePreference, writeThemePreference } from './themePreference'

const blocked = () => new DOMException('Access is denied.', 'SecurityError')

describe('readThemePreference', () => {
  it('returns the saved theme', () => {
    expect(readThemePreference(createFakeStorage({ [THEME_STORAGE_KEY]: 'dream' }), false)).toBe('dream')
  })

  it('falls back to the system preference when nothing valid is saved', () => {
    expect(readThemePreference(createFakeStorage(), true)).toBe('dark')
    expect(readThemePreference(createFakeStorage({ [THEME_STORAGE_KEY]: 'neon' }), false)).toBe('light')
  })

  it('falls back without throwing when storage is missing or failing', () => {
    expect(readThemePreference(null, true)).toBe('dark')
    expect(readThemePreference(createFakeStorage({}, { getError: blocked() }), false)).toBe('light')
  })
})

describe('writeThemePreference', () => {
  it('stores the theme and never throws', () => {
    const storage = createFakeStorage()

    writeThemePreference(storage, 'warm')

    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('warm')
    expect(() => writeThemePreference(null, 'dark')).not.toThrow()
    expect(() => writeThemePreference(createFakeStorage({}, { setError: blocked() }), 'dark')).not.toThrow()
  })
})
