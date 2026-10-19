/*
Color utility functions
*/

/* Convert a 16-bit channel (4 hex digits) to 8 bits */
function hex4To8Bit(hex4) {
  return Math.round(parseInt(hex4, 16) / 257)
}

/* Convert #RRRRGGGGBBBB (4 hex digits per channel, as stored by
Gdk.Color.to_string() in Gramps 3.4 and 4.0) to rgb() */
export function hex12ToCss(hex, a = 1) {
  const result = /^#?([a-f\d]{4})([a-f\d]{4})([a-f\d]{4})$/i.exec(hex)
  if (result) {
    const r = hex4To8Bit(result[1])
    const g = hex4To8Bit(result[2])
    const b = hex4To8Bit(result[3])
    return `rgb(${r}, ${g}, ${b}, ${a})`
  }

  return null
}

/* Convert #RRGGBB to rgb() */
export function hex6ToCss(hex, a = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    return `rgb(${r}, ${g}, ${b}, ${a})`
  }

  return null
}

/* Pick the right CSS conversion based on color string length */
export function colorToCss(color, a = 1) {
  return (
    (color?.length > 7 ? hex12ToCss(color, a) : hex6ToCss(color, a)) ??
    `rgba(0,0,0,${a})`
  )
}

function supportsRelativeColor() {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('color', 'oklch(from red l c h)')
  )
}

/* Tag color as CSS, with its lightness kept within the readable range of
the current theme (--grampsjs-tag-lightness-min/-max in global.css). Hue and
chroma are kept, so a black tag shows light grey on the dark theme. Browsers
without relative color syntax get the plain color. */
export function tagColorToCss(color, a = 1) {
  const css = colorToCss(color, a)
  if (!supportsRelativeColor()) {
    return css
  }
  return `oklch(from ${css} clamp(var(--grampsjs-tag-lightness-min, 0), l, var(--grampsjs-tag-lightness-max, 1)) c h / alpha)`
}

/* Convert #RRRRGGGGBBBB back to #rrggbb */
export function hex12ToHex6(hex) {
  const result = /^#?([a-f\d]{4})([a-f\d]{4})([a-f\d]{4})$/i.exec(hex)
  if (!result) return null
  const r = hex4To8Bit(result[1])
  const g = hex4To8Bit(result[2])
  const b = hex4To8Bit(result[3])
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/* Return a hex6 color suitable for a color picker input */
export function colorForPicker(color, defaultColor = '#1f77b4') {
  if (!color) return defaultColor
  if (color.length > 7) return hex12ToHex6(color) ?? defaultColor
  return color
}

/* Convert #rrggbb to #RRRRGGGGBBBB */
export function hex6ToHex12(hex6) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex6)
  if (result) {
    const r = parseInt(result[1], 16) * 257
    const g = parseInt(result[2], 16) * 257
    const b = parseInt(result[3], 16) * 257
    return `#${r.toString(16).padStart(4, '0')}${g
      .toString(16)
      .padStart(4, '0')}${b.toString(16).padStart(4, '0')}`
  }
  return null
}
