import {describe, it, expect} from 'vitest'
import {formatUnionDates} from '../../src/charts/RelationshipChart.js'

const mkDates = (marriageDate, divorceDate) => ({
  marriage: marriageDate ? {date: marriageDate} : null,
  divorce: divorceDate ? {date: divorceDate} : null,
})

describe('formatUnionDates', () => {
  it('returns marriage year for "married" status', () => {
    expect(formatUnionDates('married', mkDates('1985', null))).to.equal('1985')
  })

  it('returns empty string for "married" with no marriage date', () => {
    expect(formatUnionDates('married', mkDates(null, null))).to.equal('')
  })

  it('returns range for "divorced" with both dates', () => {
    expect(formatUnionDates('divorced', mkDates('1985', '2001'))).to.equal(
      '1985–2001'
    )
  })

  it('returns divorce year only for "divorced" with no marriage date', () => {
    expect(formatUnionDates('divorced', mkDates(null, '2001'))).to.equal('2001')
  })

  it('returns marriage year only for "divorced" with no divorce date', () => {
    expect(formatUnionDates('divorced', mkDates('1985', null))).to.equal('1985')
  })

  it('returns empty string for "divorced" with no dates at all', () => {
    expect(formatUnionDates('divorced', mkDates(null, null))).to.equal('')
  })

  it('returns marriage year for "widowed" status', () => {
    expect(formatUnionDates('widowed', mkDates('1962', null))).to.equal('1962')
  })

  it('returns marriage year for "partners" status', () => {
    expect(formatUnionDates('partners', mkDates('2010', null))).to.equal('2010')
  })

  it('returns empty string for "partners" with no marriage date', () => {
    expect(formatUnionDates('partners', mkDates(null, null))).to.equal('')
  })

  it('returns empty string for "unknown" status', () => {
    expect(formatUnionDates('unknown', mkDates('1990', null))).to.equal('')
  })

  it('returns empty string for unrecognised status', () => {
    expect(formatUnionDates('something-else', mkDates('1990', null))).to.equal(
      ''
    )
  })

  it('returns empty string when unionDates is null', () => {
    expect(formatUnionDates('married', null)).to.equal('')
  })

  it('returns empty string when unionDates is undefined', () => {
    expect(formatUnionDates('married', undefined)).to.equal('')
  })

  it('returns empty string when status is null', () => {
    expect(formatUnionDates(null, mkDates('1985', null))).to.equal('')
  })

  it('returns empty string when status is undefined', () => {
    expect(formatUnionDates(undefined, mkDates('1985', null))).to.equal('')
  })

  it('returns empty string when date string has no 4-digit year', () => {
    expect(formatUnionDates('married', mkDates('Jan 85', null))).to.equal('')
  })

  it('extracts year from verbose date string', () => {
    expect(
      formatUnionDates('married', mkDates('12 March 1985', null))
    ).to.equal('1985')
  })

  it('handles date string that is empty', () => {
    expect(
      formatUnionDates('married', {marriage: {date: ''}, divorce: null})
    ).to.equal('')
  })

  it('handles marriage/divorce objects without date property', () => {
    expect(
      formatUnionDates('divorced', {
        marriage: {year: 1985},
        divorce: {year: 2001},
      })
    ).to.equal('')
  })
})
