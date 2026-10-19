import {describe, it, expect, afterEach, vi} from 'vitest'
import {
  hex6ToCss,
  hex12ToCss,
  hex6ToHex12,
  colorToCss,
  hex12ToHex6,
  colorForPicker,
  tagColorToCss,
} from '../../src/color.js'

describe('hex6ToCss', () => {
  it('converts red', () => {
    expect(hex6ToCss('#ff0000')).to.equal('rgb(255, 0, 0, 1)')
  })

  it('converts black', () => {
    expect(hex6ToCss('#000000')).to.equal('rgb(0, 0, 0, 1)')
  })

  it('converts white', () => {
    expect(hex6ToCss('#ffffff')).to.equal('rgb(255, 255, 255, 1)')
  })

  it('works without leading #', () => {
    expect(hex6ToCss('ff0000')).to.equal('rgb(255, 0, 0, 1)')
  })

  it('respects alpha', () => {
    expect(hex6ToCss('#ff0000', 0.5)).to.equal('rgb(255, 0, 0, 0.5)')
  })

  it('returns null for invalid input', () => {
    expect(hex6ToCss('invalid')).to.equal(null)
  })
})

describe('hex6ToHex12 + hex12ToCss round-trip', () => {
  it('round-trips red', () => {
    const hex12 = hex6ToHex12('#ff0000')
    const result = hex12ToCss(hex12)
    expect(hex6ToCss('#ff0000')).to.equal(result)
  })

  it('round-trips black', () => {
    const hex12 = hex6ToHex12('#000000')
    const result = hex12ToCss(hex12)
    expect(hex6ToCss('#000000')).to.equal(result)
  })

  it('round-trips white', () => {
    const hex12 = hex6ToHex12('#ffffff')
    const result = hex12ToCss(hex12)
    expect(hex6ToCss('#ffffff')).to.equal(result)
  })

  it('respects alpha through hex12ToCss', () => {
    const hex12 = hex6ToHex12('#ff0000')
    expect(hex12ToCss(hex12, 0.5)).to.equal('rgb(255, 0, 0, 0.5)')
  })

  it('hex6ToHex12 returns null for invalid input', () => {
    expect(hex6ToHex12('invalid')).to.equal(null)
  })

  it('hex12ToCss returns null for invalid input', () => {
    expect(hex12ToCss('invalid')).to.equal(null)
  })
})

describe('hex12ToHex6', () => {
  it('round-trips red', () => {
    expect(hex12ToHex6(hex6ToHex12('#ff0000'))).to.equal('#ff0000')
  })

  it('round-trips black', () => {
    expect(hex12ToHex6(hex6ToHex12('#000000'))).to.equal('#000000')
  })

  it('round-trips white', () => {
    expect(hex12ToHex6(hex6ToHex12('#ffffff'))).to.equal('#ffffff')
  })

  it('returns null for invalid input', () => {
    expect(hex12ToHex6('invalid')).to.equal(null)
  })
})

describe('colorToCss', () => {
  it('handles hex6 color', () => {
    expect(colorToCss('#ff0000', 0.9)).to.equal('rgb(255, 0, 0, 0.9)')
  })

  it('handles hex12 color', () => {
    const hex12 = hex6ToHex12('#ff0000')
    expect(colorToCss(hex12, 0.9)).to.equal('rgb(255, 0, 0, 0.9)')
  })

  it('falls back to rgba(0,0,0) for null color', () => {
    expect(colorToCss(null, 0.5)).to.equal('rgba(0,0,0,0.5)')
  })

  it('defaults alpha to 1', () => {
    expect(colorToCss('#000000')).to.equal('rgb(0, 0, 0, 1)')
  })
})

describe('colorForPicker', () => {
  it('returns hex6 color as-is', () => {
    expect(colorForPicker('#1f77b4')).to.equal('#1f77b4')
  })

  it('converts hex12 to hex6', () => {
    expect(colorForPicker(hex6ToHex12('#ff0000'))).to.equal('#ff0000')
  })

  it('returns default for null', () => {
    expect(colorForPicker(null)).to.equal('#1f77b4')
  })

  it('respects custom default color', () => {
    expect(colorForPicker(null, '#aabbcc')).to.equal('#aabbcc')
  })
})

describe('tagColorToCss', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('limits the lightness to the theme range when supported', () => {
    vi.stubGlobal('CSS', {supports: () => true})
    expect(tagColorToCss('#000000', 0.9)).to.equal(
      'oklch(from rgb(0, 0, 0, 0.9) clamp(var(--grampsjs-tag-lightness-min, 0), l, var(--grampsjs-tag-lightness-max, 1)) c h / alpha)'
    )
  })

  it('returns the plain color without relative color support', () => {
    vi.stubGlobal('CSS', {supports: () => false})
    expect(tagColorToCss('#ff0000', 0.12)).to.equal('rgb(255, 0, 0, 0.12)')
  })

  it('returns the plain color when CSS is not available', () => {
    vi.stubGlobal('CSS', undefined)
    expect(tagColorToCss('#ff0000')).to.equal('rgb(255, 0, 0, 1)')
  })

  it('falls back to black for an invalid color', () => {
    vi.stubGlobal('CSS', {supports: () => false})
    expect(tagColorToCss('nonsense', 0.5)).to.equal('rgba(0,0,0,0.5)')
  })
})
