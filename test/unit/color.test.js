import {describe, it, expect} from 'vitest'
import {
  hex6ToCss,
  hex12ToCss,
  hex6ToHex12,
  colorToCss,
  hex12ToHex6,
  colorForPicker,
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

describe('12-digit colors as stored by Gramps', () => {
  it('reads #RRRRGGGGBBBB as 16 bits per channel', () => {
    expect(hex12ToCss('#076780873bf0')).to.equal('rgb(7, 128, 60, 1)')
    expect(hex12ToCss('#efb60c280c28', 0.5)).to.equal('rgb(239, 12, 12, 0.5)')
    expect(hex12ToCss('#ffffffffffff')).to.equal('rgb(255, 255, 255, 1)')
    expect(hex12ToCss('#000000000000')).to.equal('rgb(0, 0, 0, 1)')
  })

  it('converts to #rrggbb for the color picker', () => {
    expect(hex12ToHex6('#076780873bf0')).to.equal('#07803c')
    expect(colorForPicker('#efb60c280c28')).to.equal('#ef0c0c')
    expect(colorForPicker('#ffffffffffff')).to.equal('#ffffff')
  })

  it('writes 4 hex digits per channel', () => {
    expect(hex6ToHex12('#ff0000')).to.equal('#ffff00000000')
    expect(hex6ToHex12('#07803c')).to.equal('#070780803c3c')
  })

  it('rejects digits that are not hexadecimal', () => {
    expect(hex12ToCss('#0767808g3bf0')).to.equal(null)
    expect(hex12ToHex6('#0767808g3bf0')).to.equal(null)
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
