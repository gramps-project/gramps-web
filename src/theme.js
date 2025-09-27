export function applyTheme(theme) {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

  document.documentElement.setAttribute(
    'data-theme',
    theme === undefined || theme === 'system' ? systemTheme : theme
  )
}
