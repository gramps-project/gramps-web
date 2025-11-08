export function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function getCurrentTheme(theme) {
  return theme === undefined || theme === 'system' ? getSystemTheme() : theme
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', getCurrentTheme(theme))
}
