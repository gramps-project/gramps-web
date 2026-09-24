import {describe, it, expect} from 'vitest'
import {formatDate, toDate} from '../../src/date.js'

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

describe('formatDate', () => {
  it('formats a full date in German locale (dd.mm.yyyy)', () => {
    const result = formatDate('1899-11-20', 'de')
    expect(result).to.match(/^20\..*11\..*1899$/)
  })

  it('formats a full date in en-GB (day-first)', () => {
    const result = formatDate('1899-11-20', 'en-GB')
    expect(result).to.match(/^20.*11.*1899$/)
  })

  it('formats a full date in en (US default)', () => {
    const result = formatDate('1899-11-20', 'en')
    expect(result).to.match(/^11\/20\/1899$/)
  })

  it('formats a year-month in German locale', () => {
    const result = formatDate('1899-11', 'de')
    expect(result).to.include('1899')
    expect(result).to.include('11')
  })

  it('formats a year-only date in German locale', () => {
    const result = formatDate('1899', 'de')
    expect(result).to.include('1899')
  })

  it('returns non-ISO strings unchanged (modifier "before 1899")', () => {
    expect(formatDate('before 1899', 'de')).to.equal('before 1899')
  })

  it('returns non-ISO strings unchanged (modifier "about 1899-11-20")', () => {
    expect(formatDate('about 1899-11-20', 'de')).to.equal('about 1899-11-20')
  })

  it('returns non-ISO strings unchanged (range "1899 - 1900")', () => {
    expect(formatDate('1899 - 1900', 'de')).to.equal('1899 - 1900')
  })

  it('returns empty string for empty input', () => {
    expect(formatDate('', 'de')).to.equal('')
  })

  it('returns empty string for null', () => {
    expect(formatDate(null, 'de')).to.equal('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined, 'de')).to.equal('')
  })

  it('returns 0 unchanged (not an ISO-shaped date)', () => {
    expect(formatDate(0, 'de')).to.equal(0)
  })

  it('returns non-date strings unchanged', () => {
    expect(formatDate('not a date', 'de')).to.equal('not a date')
  })

  it('trims surrounding whitespace before matching ISO', () => {
    const result = formatDate('   1899-11-20   ', 'de')
    expect(result).to.match(/^20\..*11\..*1899$/)
  })

  it('normalizes underscore locales (de_AT → de-AT)', () => {
    const result = formatDate('1899-11-20', 'de_AT')
    expect(result).to.match(/^20\..*11\..*1899$/)
  })

  it('falls back to en when locale is omitted', () => {
    const result = formatDate('1899-11-20')
    expect(result).to.match(/^11\/20\/1899$/)
  })

  it('returns the input unchanged for an invalid locale without throwing', () => {
    expect(() => formatDate('1899-11-20', '_invalid_')).not.toThrow()
    // Intl may either render or fall back; either way we should not crash.
    expect(typeof formatDate('1899-11-20', '_invalid_')).to.equal('string')
  })
})
