/**
 * Unicode code-point utilities for bridging JavaScript (UTF-16) and the
 * Gramps API (Python-style Unicode code-point indices).
 *
 * JavaScript strings are UTF-16: a non-BMP character such as 🙂 (U+1F642)
 * occupies *two* code units and therefore has `.length === 2`, but the Gramps
 * API—like Python—treats it as a single character with index cost 1. Every
 * function here that reads or writes a "character index" or "character count"
 * uses code-point semantics so that the values are compatible with the API.
 *
 * All four functions use for...of (which yields one entry per code point) and
 * ch.length (1 for BMP, 2 for non-BMP surrogate pairs) to track the UTF-16
 * cursor incrementally, avoiding intermediate array allocations.
 */

/**
 * Return the number of Unicode code points in `str`.
 * Use instead of `str.length` whenever the count must match a Gramps API index.
 */
export function charLength(str) {
  let n = 0
  // for...of yields one entry per code point, regardless of UTF-16 width
  // eslint-disable-next-line no-unused-vars
  for (const _ of str) n++
  return n
}

/**
 * Convert `charIndex` — a Unicode code-point index — to the UTF-16 code-unit
 * offset required by `document.getSelection().collapse()`, `Range.setStart()`, etc.
 */
export function charToDomOffset(text, charIndex) {
  let utf16Idx = 0
  let charIdx = 0
  for (const ch of text) {
    if (charIdx >= charIndex) break
    utf16Idx += ch.length // 1 for BMP chars, 2 for non-BMP surrogate pairs
    charIdx++
  }
  return utf16Idx
}

/**
 * Convert `domOffset` — a UTF-16 code-unit offset within `text` as returned by
 * the browser's Range API — to a Unicode code-point index.
 */
export function domOffsetToChar(text, domOffset) {
  let utf16Idx = 0
  let charIdx = 0
  for (const ch of text) {
    if (utf16Idx >= domOffset) break
    utf16Idx += ch.length // 1 for BMP chars, 2 for non-BMP surrogate pairs
    charIdx++
  }
  return charIdx
}

/**
 * Slice `str` using Unicode code-point indices (equivalent to Python `str[start:end]`).
 * Use instead of `str.slice()` whenever `start`/`end` come from or go to the Gramps API.
 * Delegates to native str.slice() after converting the indices to UTF-16 offsets.
 */
export function charSlice(str, start, end) {
  const utf16Start = charToDomOffset(str, start)
  const utf16End = end === undefined ? str.length : charToDomOffset(str, end)
  return str.slice(utf16Start, utf16End)
}
