/**
 * Unicode code-point utilities for bridging JavaScript (UTF-16) and the
 * Gramps API (Python-style Unicode code-point indices).
 *
 * JavaScript strings are UTF-16: a non-BMP character such as 🙂 (U+1F642)
 * occupies *two* code units and therefore has `.length === 2`, but the Gramps
 * API—like Python—treats it as a single character with index cost 1. Every
 * function here that reads or writes a "character index" or "character count"
 * uses code-point semantics so that the values are compatible with the API.
 */

/**
 * Return the number of Unicode code points in `str`.
 * Use instead of `str.length` whenever the count must match a Gramps API index.
 */
export function charLength(str) {
  return [...str].length
}

/**
 * Slice `str` using Unicode code-point indices (equivalent to Python `str[start:end]`).
 * Use instead of `str.slice()` whenever `start`/`end` come from or go to the Gramps API.
 */
export function charSlice(str, start, end) {
  const chars = Array.from(str)
  return (
    end === undefined ? chars.slice(start) : chars.slice(start, end)
  ).join('')
}

/**
 * Convert `domOffset` — a UTF-16 code-unit offset within `text` as returned by
 * the browser's Range API — to a Unicode code-point index.
 */
export function domOffsetToChar(text, domOffset) {
  return [...text.slice(0, domOffset)].length
}

/**
 * Convert `charIndex` — a Unicode code-point index — to the UTF-16 code-unit
 * offset required by `document.getSelection().collapse()`, `Range.setStart()`, etc.
 */
export function charToDomOffset(text, charIndex) {
  return Array.from(text).slice(0, charIndex).join('').length
}
