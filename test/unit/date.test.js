import {describe, it, expect} from 'vitest'
import {toDate} from '../../src/date.js'

describe('toDate', () => {
  it('formats a normal date', () => {
    expect(toDate([15, 6, 1985])).to.equal('1985-6-15')
  })

  it('formats day/month zero (year only)', () => {
    expect(toDate([0, 0, 1900])).to.equal('1900-0-0')
  })

  it('returns empty string for undefined', () => {
    expect(toDate(undefined)).to.equal('')
  })

  it('returns empty string for null', () => {
    expect(toDate(null)).to.equal('')
  })

  it('returns empty string for empty array', () => {
    expect(toDate([])).to.equal('undefined-undefined-undefined')
  })
})
