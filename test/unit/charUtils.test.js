import {describe, it, expect} from 'vitest'
import {
  charLength,
  charSlice,
  domOffsetToChar,
  charToDomOffset,
} from '../../src/charUtils.js'

// ASCII-only string: all functions should behave identically to their naive
// JS equivalents (str.length, str.slice, raw offset arithmetic).
describe('charLength', () => {
  it('returns the number of characters for ASCII strings', () => {
    expect(charLength('')).toBe(0)
    expect(charLength('hello')).toBe(5)
  })

  it('counts each BMP character as 1', () => {
    // Accented letters, CJK, etc. are all in the BMP and have .length === 1
    expect(charLength('café')).toBe(4)
    expect(charLength('日本語')).toBe(3)
  })

  it('counts each non-BMP emoji as 1 code point (not 2 UTF-16 units)', () => {
    expect(charLength('🙂')).toBe(1) // U+1F642 — surrogate pair in JS
    expect(charLength('fff 🙂 fff')).toBe(9) // str.length === 10
    expect(charLength('a🎉b')).toBe(3) // str.length === 4
  })

  it('handles strings with multiple emoji', () => {
    expect(charLength('🙂🎉')).toBe(2) // str.length === 4
  })
})

describe('charSlice', () => {
  it('behaves like str.slice for ASCII', () => {
    expect(charSlice('hello', 1, 3)).toBe('el')
    expect(charSlice('hello', 2)).toBe('llo')
    expect(charSlice('hello', 0, 0)).toBe('')
  })

  it('slices correctly around BMP special characters', () => {
    expect(charSlice('café', 0, 3)).toBe('caf')
    expect(charSlice('café', 3)).toBe('é')
  })

  it('treats each non-BMP emoji as a single character when slicing', () => {
    // "fff 🙂 fff": code points 0-8
    const s = 'fff 🙂 fff'
    expect(charSlice(s, 0, 4)).toBe('fff ') // stop before emoji
    expect(charSlice(s, 4, 5)).toBe('🙂') // just the emoji
    expect(charSlice(s, 5, 9)).toBe(' fff') // after the emoji
    expect(charSlice(s, 7, 9)).toBe('ff') // last two f's
  })

  it('returns the tail when end is omitted', () => {
    expect(charSlice('a🎉b', 2)).toBe('b')
    expect(charSlice('a🎉b', 1)).toBe('🎉b')
  })

  it('round-trips charSlice(0, n) + charSlice(n) === original', () => {
    const s = 'hi 🌍 there'
    for (let i = 0; i <= charLength(s); i++) {
      expect(charSlice(s, 0, i) + charSlice(s, i)).toBe(s)
    }
  })
})

describe('domOffsetToChar', () => {
  it('is identity for ASCII (UTF-16 offset === code-point index)', () => {
    expect(domOffsetToChar('hello', 0)).toBe(0)
    expect(domOffsetToChar('hello', 3)).toBe(3)
    expect(domOffsetToChar('hello', 5)).toBe(5)
  })

  it('converts correctly when emoji precedes the offset', () => {
    // "fff 🙂 fff" — the emoji occupies UTF-16 positions 4 and 5
    const s = 'fff 🙂 fff'
    // UTF-16 offset 4 = start of emoji = code point 4
    expect(domOffsetToChar(s, 4)).toBe(4)
    // UTF-16 offset 6 = space after emoji = code point 5
    expect(domOffsetToChar(s, 6)).toBe(5)
    // UTF-16 offset 8 = 2nd trailing 'f' = code point 7
    expect(domOffsetToChar(s, 8)).toBe(7)
    // UTF-16 offset 10 = end of string = code point 9
    expect(domOffsetToChar(s, 10)).toBe(9)
  })

  it('handles a string consisting of only emoji', () => {
    // "🙂🎉": UTF-16 length 4, code-point length 2
    expect(domOffsetToChar('🙂🎉', 0)).toBe(0)
    expect(domOffsetToChar('🙂🎉', 2)).toBe(1) // after first emoji
    expect(domOffsetToChar('🙂🎉', 4)).toBe(2) // end
  })
})

describe('charToDomOffset', () => {
  it('is identity for ASCII', () => {
    expect(charToDomOffset('hello', 0)).toBe(0)
    expect(charToDomOffset('hello', 3)).toBe(3)
    expect(charToDomOffset('hello', 5)).toBe(5)
  })

  it('adds 1 extra UTF-16 unit for each preceding non-BMP character', () => {
    const s = 'fff 🙂 fff'
    // code point 4 = emoji start → UTF-16 offset 4 (unchanged)
    expect(charToDomOffset(s, 4)).toBe(4)
    // code point 5 = space after emoji → UTF-16 offset 6 (+1 for emoji)
    expect(charToDomOffset(s, 5)).toBe(6)
    // code point 7 = 2nd trailing 'f' → UTF-16 offset 8 (+1 for emoji)
    expect(charToDomOffset(s, 7)).toBe(8)
    // code point 9 = end → UTF-16 offset 10 (+1)
    expect(charToDomOffset(s, 9)).toBe(10)
  })

  it('is the inverse of domOffsetToChar for all positions', () => {
    const s = 'hi 🌍 there 🎉!'
    const utf16Len = s.length
    for (let domOff = 0; domOff <= utf16Len; domOff++) {
      // Skip positions inside a surrogate pair (the low surrogate has no
      // corresponding code point, so the round-trip is only defined for
      // offsets that fall on a code-point boundary).
      const cp = domOffsetToChar(s, domOff)
      if (charToDomOffset(s, cp) === domOff) {
        expect(domOffsetToChar(s, charToDomOffset(s, cp))).toBe(cp)
      }
    }
  })

  it('charToDomOffset(domOffsetToChar(s, off)) === off for all valid offsets', () => {
    const s = 'a🙂b🎉c'
    const utf16Len = s.length
    for (let off = 0; off <= utf16Len; off++) {
      const cp = domOffsetToChar(s, off)
      // only verify offsets that land on code-point boundaries
      if (charToDomOffset(s, cp) === off) {
        expect(charToDomOffset(s, domOffsetToChar(s, off))).toBe(off)
      }
    }
  })
})
