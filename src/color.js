/*
Color utility functions
*/

/* Convert #RRRRGGGGBBBB to rgb() */
export function hex12ToCss(hex, a=1) {
  const result = /^#?([a-f\d]{4})([a-f\d]{4})([a-f\d]{4})$/i.exec(hex);
  if (result) {
      const r = parseInt(result[1], 32) / 255
      const g = parseInt(result[2], 32) / 255
      const b = parseInt(result[3], 32) / 255
      return `rgb(${r}, ${g}, ${b}, ${a})`
  }

  return null
}
