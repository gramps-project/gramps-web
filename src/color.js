/*
Color utility functions
*/

/* Convert #RRRRGGGGBBBB to rgb() */
export function hex12ToCss(hex, a = 1) {
  const result = /^#?([a-z\d]{4})([a-z\d]{4})([a-z\d]{4})$/i.exec(hex)
  if (result) {
    const r = parseInt(result[1], 32) / 255
    const g = parseInt(result[2], 32) / 255
    const b = parseInt(result[3], 32) / 255
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

/* Convert #rrggbb to #RRRRGGGGBBBB */
export function hex6ToHex12(hex6) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex6)
  if (result) {
    const r = parseInt(result[1], 16) * 255
    const g = parseInt(result[2], 16) * 255
    const b = parseInt(result[3], 16) * 255
    return `#${r.toString(32).padStart(4, '0')}${g
      .toString(32)
      .padStart(4, '0')}${b.toString(32).padStart(4, '0')}`
  }
  return null
}
