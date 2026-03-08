import {describe, it, expect} from 'vitest'
import {hex6ToCss, hex12ToCss, hex6ToHex12} from '../../src/color.js'

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
