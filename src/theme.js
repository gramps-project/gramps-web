import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  TonalPalette,
  Variant,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities'

export const DEFAULT_PRIMARY = '#6d4c41'
export const DEFAULT_SECONDARY = '#0277bd'

export function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function getCurrentTheme(theme) {
  return theme === undefined || theme === 'system' ? getSystemTheme() : theme
}

function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

export function applyColors(
  primaryHex = DEFAULT_PRIMARY,
  secondaryHex = DEFAULT_SECONDARY,
  isDark = false
) {
  const primaryHct = Hct.fromInt(argbFromHex(primaryHex))
  const secondaryHct = Hct.fromInt(argbFromHex(secondaryHex))
  const secondaryPalette = TonalPalette.fromHueAndChroma(
    secondaryHct.hue,
    secondaryHct.chroma
  )

  const primaryPalette = TonalPalette.fromHueAndChroma(
    primaryHct.hue,
    primaryHct.chroma
  )

  const scheme = new DynamicScheme({
    sourceColorHct: primaryHct,
    variant: Variant.TONAL_SPOT,
    isDark,
    contrastLevel: 0,
    // Preserve the seed's own hue+chroma rather than TONAL_SPOT's fixed values.
    primaryPalette,
    secondaryPalette,
    // Chroma 0 → pure neutral grays; no hue tint bleeds into surfaces.
    neutralPalette: TonalPalette.fromHueAndChroma(primaryHct.hue, 0),
    neutralVariantPalette: TonalPalette.fromHueAndChroma(primaryHct.hue, 0),
  })

  const root = document.documentElement
  for (const [name, color] of Object.entries(MaterialDynamicColors)) {
    if (typeof color?.getArgb !== 'function') continue
    root.style.setProperty(
      `--md-sys-color-${toKebabCase(name)}`,
      hexFromArgb(color.getArgb(scheme))
    )
  }

  // Primary: use seed's own tone clamped to [30, 50] so users see their chosen
  // colour on the app bar. Tone 30-50 always reads white on-primary text.
  const primaryTone = isDark
    ? Math.min(80, Math.max(60, Math.round(primaryHct.tone)))
    : Math.min(50, Math.max(30, Math.round(primaryHct.tone)))
  root.style.setProperty(
    '--md-sys-color-primary',
    hexFromArgb(primaryPalette.tone(primaryTone))
  )

  // M3 achromatic tones 90-98 are darker than expected for a web app.
  // Override light-mode surfaces to lighter neutrals.
  if (!isDark) {
    root.style.setProperty('--md-sys-color-background', '#ffffff')
    root.style.setProperty('--md-sys-color-surface', '#ffffff')
    // lowest/low/container → menus, cards, sheets: white
    root.style.setProperty('--md-sys-color-surface-container-lowest', '#ffffff')
    root.style.setProperty('--md-sys-color-surface-container-low', '#ffffff')
    root.style.setProperty('--md-sys-color-surface-container', '#ffffff')
    // high/highest → filled input and select backgrounds: light gray
    root.style.setProperty(
      '--md-sys-color-surface-container-high',
      'rgb(240, 240, 240)'
    )
    root.style.setProperty(
      '--md-sys-color-surface-container-highest',
      'rgb(235, 235, 235)'
    )
  }

  // Action color for edit/add/delete buttons: clamp tone to a readable range
  // so very light or very dark seeds still contrast against their background.
  const actionTone = isDark
    ? Math.min(80, Math.max(60, Math.round(secondaryHct.tone)))
    : Math.min(55, Math.max(30, Math.round(secondaryHct.tone)))
  root.style.setProperty(
    '--mdc-theme-secondary',
    hexFromArgb(secondaryPalette.tone(actionTone))
  )
  root.style.setProperty(
    '--mdc-theme-on-secondary',
    actionTone < 60 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)'
  )
}

export function applyScheme(
  primaryHex = DEFAULT_PRIMARY,
  secondaryHex = DEFAULT_SECONDARY,
  theme
) {
  const isDark = getCurrentTheme(theme) === 'dark'
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  applyColors(primaryHex, secondaryHex, isDark)
}
