import {describe, it, expect} from 'vitest'
import {maritalStatusToMarker} from '../../src/charts/RelationshipChart.js'

describe('maritalStatusToMarker', () => {
  it('returns two filled rings, solid bar, no slash, no cross for "married"', () => {
    expect(maritalStatusToMarker('married')).to.deep.equal({
      rings: 2,
      filled: true,
      dashed: false,
      slash: false,
      cross: false,
    })
  })

  it('returns two filled rings, solid bar, with slash for "divorced"', () => {
    expect(maritalStatusToMarker('divorced')).to.deep.equal({
      rings: 2,
      filled: true,
      dashed: false,
      slash: true,
      cross: false,
    })
  })

  it('returns one open ring, dashed bar, no slash, no cross for "partners"', () => {
    expect(maritalStatusToMarker('partners')).to.deep.equal({
      rings: 1,
      filled: false,
      dashed: true,
      slash: false,
      cross: false,
    })
  })

  it('returns one filled ring, solid bar, no slash, with cross for "widowed"', () => {
    expect(maritalStatusToMarker('widowed')).to.deep.equal({
      rings: 1,
      filled: true,
      dashed: false,
      slash: false,
      cross: true,
    })
  })

  it('returns neutral descriptor (0 rings, no decoration) for "unknown"', () => {
    expect(maritalStatusToMarker('unknown')).to.deep.equal({
      rings: 0,
      filled: false,
      dashed: false,
      slash: false,
      cross: false,
    })
  })

  it('returns neutral descriptor for an unrecognised status string', () => {
    expect(maritalStatusToMarker('something-else')).to.deep.equal({
      rings: 0,
      filled: false,
      dashed: false,
      slash: false,
      cross: false,
    })
  })

  it('returns neutral descriptor for empty string', () => {
    expect(maritalStatusToMarker('')).to.deep.equal({
      rings: 0,
      filled: false,
      dashed: false,
      slash: false,
      cross: false,
    })
  })

  it('returns neutral descriptor for null input', () => {
    expect(maritalStatusToMarker(null)).to.deep.equal({
      rings: 0,
      filled: false,
      dashed: false,
      slash: false,
      cross: false,
    })
  })

  it('returns neutral descriptor for undefined input', () => {
    expect(maritalStatusToMarker(undefined)).to.deep.equal({
      rings: 0,
      filled: false,
      dashed: false,
      slash: false,
      cross: false,
    })
  })
})
