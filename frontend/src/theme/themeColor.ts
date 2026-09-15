const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]'

export function syncThemeColor(): void {
  const meta = document.querySelector(THEME_COLOR_SELECTOR)
  const background = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
  if (meta && background) meta.setAttribute('content', background)
}
